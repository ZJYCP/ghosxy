import * as https from 'https'
import * as http from 'http'
import * as tls from 'tls'
import httpProxy from 'http-proxy'
import { Readable } from 'stream'
import log from 'electron-log'
import { certService } from './CertService'
import { storeService } from './StoreService'
import { ModelMapping, Provider } from '../../shared/types'

// 已知 API 提供商的认证方式映射 (基于 sourceHost)
// 可扩展：添加新的 API 提供商只需在此映射中添加条目
const AUTH_HEADER_MAP: Record<string, (apiKey: string) => Record<string, string>> = {
  'api.anthropic.com': (apiKey) => ({ 'x-api-key': apiKey })
}

export class ProxyService {
  private proxy: httpProxy
  private server: https.Server | null = null

  constructor() {
    this.proxy = httpProxy.createProxyServer({
      secure: false, // 忽略上游（目标服务器）的自签名证书错误
      changeOrigin: true, // 修改 Host 头为目标地址
      selfHandleResponse: false // 让代理自动处理响应
    })

    // 错误处理
    this.proxy.on('error', (err, _req, res) => {
      log.error('[Proxy] Error:', err)
      if (res instanceof http.ServerResponse && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Proxy Gateway Error', details: err.message }))
      }
    })
  }

  /**
   * 收集完整的请求体
   */
  private collectRequestBody(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  }

  /**
   * 应用模型映射
   * @param body 原始请求体 JSON 对象
   * @param mappings 模型映射配置
   * @returns 修改后的 JSON 对象和是否被修改的标志
   */
  private applyModelMapping(
    body: Record<string, unknown>,
    mappings: ModelMapping[]
  ): {
    modified: boolean
    body: Record<string, unknown>
    originalModel?: string
    newModel?: string
  } {
    if (!body.model || typeof body.model !== 'string' || mappings.length === 0) {
      return { modified: false, body }
    }

    const originalModel = body.model
    const mapping = mappings.find((m) => m.from === originalModel)

    if (mapping) {
      return {
        modified: true,
        body: { ...body, model: mapping.to },
        originalModel,
        newModel: mapping.to
      }
    }

    return { modified: false, body }
  }

  /**
   * 判断是否为需要解析 Body 的请求
   */
  private shouldParseBody(req: http.IncomingMessage): boolean {
    const contentType = req.headers['content-type'] || ''
    const method = req.method?.toUpperCase()
    return method === 'POST' && contentType.includes('application/json')
  }

  /**
   * 应用 URL 路径中的模型映射 (Gemini 风格)
   * URL 格式: /v1beta/models/{model}:action 或 /v1beta/models/{model}
   * @param url 原始 URL
   * @param mappings 模型映射配置
   * @returns 修改后的 URL 和映射信息
   */
  private applyUrlModelMapping(
    url: string,
    mappings: ModelMapping[]
  ): { modified: boolean; url: string; originalModel?: string; newModel?: string } {
    if (mappings.length === 0) {
      return { modified: false, url }
    }

    // 匹配 Gemini 风格的 URL: /v1beta/models/{model}:action 或 /v1beta/models/{model}
    // 也支持 /v1/models/{model} 格式
    const modelUrlPattern = /^(\/v1(?:beta)?\/models\/)([^/:]+)([:\/].*)?$/
    const match = url.match(modelUrlPattern)

    if (!match) {
      return { modified: false, url }
    }

    const [, prefix, model, suffix = ''] = match
    const mapping = mappings.find((m) => m.from === model)

    if (mapping) {
      const newUrl = `${prefix}${mapping.to}${suffix}`
      return {
        modified: true,
        url: newUrl,
        originalModel: model,
        newModel: mapping.to
      }
    }

    return { modified: false, url }
  }

  /**
   * 根据 sourceHost 和 Provider 配置生成认证头
   * 认证方式基于请求的源域名 (sourceHost) 判断，而非 Provider 配置
   * @param sourceHost 拦截的源域名 (如 api.anthropic.com)
   * @param provider Provider 配置 (提供 apiKey)
   * @returns 认证头对象
   */
  private buildAuthHeaders(sourceHost: string, provider: Provider): Record<string, string> {
    if (!provider.apiKey) {
      return {}
    }

    // 检查是否有该 sourceHost 的特殊认证方式
    const authBuilder = AUTH_HEADER_MAP[sourceHost]
    if (authBuilder) {
      return authBuilder(provider.apiKey)
    }

    // 默认使用 Bearer Token 方式
    return { Authorization: `Bearer ${provider.apiKey}` }
  }

  /**
   * 启动代理服务器
   * 注意：现在不需要传入 targetUrl 了，因为是动态查找的
   */
  public async start(): Promise<void> {
    if (this.server) throw new Error('Proxy is already running')

    return new Promise((resolve, reject) => {
      try {
        // 1. 创建支持 SNI 的 HTTPS 服务器
        this.server = https.createServer(
          {
            // A. SNICallback: 核心！根据请求的域名动态获取证书
            SNICallback: (servername, cb) => {
              try {
                // log.info(`[SNI] Generating cert for: ${servername}`);
                const { key, cert } = certService.getAppCredentials(servername)
                const ctx = tls.createSecureContext({ key, cert })
                cb(null, ctx)
              } catch (e) {
                log.error(`[SNI] Error generating cert for ${servername}`, e)
                cb(e as Error, undefined)
              }
            },
            // B. 默认证书 (Fallback)，防止非 SNI 客户端连接报错
            ...certService.getAppCredentials('localhost')
          },
          (req, res) => this.handleRequest(req, res)
        )

        this.server.on('error', (err) => {
          log.error('Server Error:', err)
          this.server = null
          reject(err)
        })

        // 2. 监听双栈端口 (IPv4 + IPv6)
        this.server.listen(443, '::', () => {
          log.info('Proxy running on port 443 (Dual Stack) - Ready to route traffic')
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * 核心路由逻辑 (支持模型映射)
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const host = req.headers.host?.split(':')[0] // 拿到域名 (去除端口)
    let url = req.url

    if (!host) {
      res.writeHead(400)
      res.end('Bad Request: No Host Header')
      return
    }

    // 1. 获取所有已启用的规则
    const rules = storeService.getRules()

    // 2. 匹配规则 (Source Host)
    const matchedRule = rules.find((r) => r.isEnabled && r.sourceHost === host)

    if (!matchedRule) {
      log.warn(`[Proxy] No rule found for host: ${host}. Rejecting connection.`)
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end(`No forwarding rule configured for ${host} in Ghosxy.`)
      return
    }

    // 3. 找到目标 Provider
    const provider = storeService.getProviderById(matchedRule.targetProviderId)

    if (!provider) {
      log.error(`[Proxy] Provider not found for rule ID: ${matchedRule.id}`)
      res.writeHead(500)
      res.end('Configuration Error: Target Provider not found.')
      return
    }

    // 4. 路径重写 - Gemini OpenAI 兼容模式
    if (url && url.includes('/v1beta/openai/')) {
      const rewrittenUrl = url.replace('/v1beta/openai/', '/v1/')
      log.info(`[Path Rewrite] ${url} --> ${rewrittenUrl}`)
      url = rewrittenUrl
      req.url = rewrittenUrl
    }

    // 5. URL 模型映射 (Gemini 风格: /v1beta/models/{model}:action)
    const hasModelMappings = matchedRule.modelMappings && matchedRule.modelMappings.length > 0
    let urlMappingApplied = false
    let urlOriginalModel: string | undefined
    let urlNewModel: string | undefined

    if (hasModelMappings && url) {
      const urlMappingResult = this.applyUrlModelMapping(url, matchedRule.modelMappings)
      if (urlMappingResult.modified) {
        url = urlMappingResult.url
        req.url = urlMappingResult.url
        urlMappingApplied = true
        urlOriginalModel = urlMappingResult.originalModel
        urlNewModel = urlMappingResult.newModel
        log.info(`[URL Model Mapping] ${urlOriginalModel} -> ${urlNewModel}`)
      }
    }

    // 6. 构建基础 proxy options
    const proxyOptions: httpProxy.ServerOptions = {
      target: provider.baseUrl,
      headers: this.buildAuthHeaders(host, provider)
    }

    // 7. 请求体模型映射处理 (OpenAI 风格)
    const needsBodyParsing = this.shouldParseBody(req) && hasModelMappings && !urlMappingApplied

    if (needsBodyParsing) {
      try {
        // 收集完整请求体
        const bodyBuffer = await this.collectRequestBody(req)
        const bodyString = bodyBuffer.toString('utf-8')

        let finalBodyString = bodyString
        let bodyMappingApplied = false
        let bodyOriginalModel: string | undefined
        let bodyNewModel: string | undefined

        // 尝试解析并应用模型映射
        if (bodyString.trim()) {
          try {
            const bodyJson = JSON.parse(bodyString)
            const mappingResult = this.applyModelMapping(bodyJson, matchedRule.modelMappings)

            if (mappingResult.modified) {
              finalBodyString = JSON.stringify(mappingResult.body)
              bodyMappingApplied = true
              bodyOriginalModel = mappingResult.originalModel
              bodyNewModel = mappingResult.newModel
            }
          } catch (parseErr) {
            // JSON 解析失败，保持原始 body
            log.warn(`[Model Mapping] Failed to parse JSON body: ${parseErr}`)
          }
        }

        // 创建新的可读流作为请求体
        const bodyStream = Readable.from([Buffer.from(finalBodyString, 'utf-8')])

        // 更新 Content-Length (重要：body 大小可能已改变)
        proxyOptions.headers = {
          ...proxyOptions.headers,
          'Content-Length': Buffer.byteLength(finalBodyString, 'utf-8').toString()
        }

        // 记录日志
        if (bodyMappingApplied) {
          log.info(
            `[Route] ${req.method} https://${host}${url}  -->  ${provider.name} (${provider.baseUrl}) [Model: ${bodyOriginalModel} -> ${bodyNewModel}]`
          )
        } else {
          log.info(
            `[Route] ${req.method} https://${host}${url}  -->  ${provider.name} (${provider.baseUrl})`
          )
        }

        // 使用 buffer 选项转发修改后的请求
        this.proxy.web(req, res, {
          ...proxyOptions,
          buffer: bodyStream
        })
      } catch (err) {
        log.error(`[Proxy] Error processing request body:`, err)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal Proxy Error', details: (err as Error).message }))
      }
    } else {
      // 无需 Body 模型映射，直接转发
      // 日志中包含 URL 映射信息（如果有）
      if (urlMappingApplied) {
        log.info(
          `[Route] ${req.method} https://${host}${url}  -->  ${provider.name} (${provider.baseUrl}) [Model: ${urlOriginalModel} -> ${urlNewModel}]`
        )
      } else {
        log.info(
          `[Route] ${req.method} https://${host}${url}  -->  ${provider.name} (${provider.baseUrl})`
        )
      }
      this.proxy.web(req, res, proxyOptions)
    }
  }

  public async stop(): Promise<void> {
    if (!this.server) return
    return new Promise((resolve, reject) => {
      this.server?.close((err) => {
        if (err) return reject(err)
        this.server = null
        log.info('Proxy server stopped.')
        resolve()
      })
    })
  }

  public isRunning(): boolean {
    return this.server !== null
  }
}

export const proxyService = new ProxyService()
