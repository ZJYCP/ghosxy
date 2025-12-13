import * as https from 'https'
import * as http from 'http'
import * as tls from 'tls'
import * as httpProxy from 'http-proxy'
import log from 'electron-log'
import { certService } from './CertService'
import { storeService } from './StoreService'

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
    this.proxy.on('error', (err, req, res) => {
      log.error('[Proxy] Error:', err)
      if (res instanceof http.ServerResponse && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Proxy Gateway Error', details: err.message }))
      }
    })

    // (可选) 在这里处理请求修饰，比如修改 Header
    this.proxy.on('proxyReq', (proxyReq, req, res, options) => {
      // 如果将来要做 Model Mapping (修改 Body)，逻辑会很复杂，通常在这里处理
      // 目前我们先专注做好路由转发
    })
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
                cb(e as Error, null)
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
   * 核心路由逻辑
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const host = req.headers.host?.split(':')[0] // 拿到域名 (去除端口)
    let url = req.url

    if (!host) {
      res.writeHead(400)
      res.end('Bad Request: No Host Header')
      return
    }

    // 1. 获取所有已启用的规则
    const rules = storeService.getRules() // 假设 storeService 已经有了 getRules

    // 2. 匹配规则 (Source Host)
    const matchedRule = rules.find((r) => r.isEnabled && r.sourceHost === host)

    if (!matchedRule) {
      log.warn(`[Proxy] No rule found for host: ${host}. Rejecting connection.`)
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end(`No forwarding rule configured for ${host} in Ghosxy.`)
      return
    }

    // 3. 找到目标 Provider
    const provider = storeService.getProviderById(matchedRule.targetProviderId) // 需要在 storeService 实现

    if (!provider) {
      log.error(`[Proxy] Provider not found for rule ID: ${matchedRule.id}`)
      res.writeHead(500)
      res.end('Configuration Error: Target Provider not found.')
      return
    }

    // 4. 路径重写 - Gemini OpenAI 兼容模式
    // 将 /v1beta/openai/* 重写为 /v1/*
    if (url && url.includes('/v1beta/openai/')) {
      const rewrittenUrl = url.replace('/v1beta/openai/', '/v1/')
      log.info(`[Path Rewrite] ${url} --> ${rewrittenUrl}`)
      url = rewrittenUrl
      req.url = rewrittenUrl // 修改请求对象的 URL
    }

    // 5. 执行转发
    log.info(
      `[Route] ${req.method} https://${host}${url}  -->  ${provider.name} (${provider.baseUrl})`
    )

    // 构建 options
    const proxyOptions: httpProxy.ServerOptions = {
      target: provider.baseUrl,
      headers: {
        // 如果 Provider 有 API Key，我们要决定是现在注入，还是保留客户端的
        // 这里做一个简单的逻辑：如果 Provider 配置了 Key，就覆盖；否则用客户端传来的
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {})
      }
    }

    // 6. Model Mapping (预留位置)
    // 如果需要做模型映射，我们可以在这里把 matchedRule 挂载到 req 上
    // 然后在 proxyReq 事件中修改 Body。
    // 目前暂不实现复杂的 Body 修改，先跑通路由。

    this.proxy.web(req, res, proxyOptions)
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
