import * as forge from 'node-forge'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import log from 'electron-log'

const pki = forge.pki

export class CertService {
  private certDir: string

  // 1. CA 缓存：只在内存中加载一次
  private caCert: forge.pki.Certificate | null = null
  private caKey: forge.pki.PrivateKey | null = null

  // 2. 域名证书缓存：Map<域名, {key, cert}>
  // 避免对同一个域名重复生成证书
  private certCache: Map<string, { key: string; cert: string }> = new Map()

  constructor() {
    this.certDir = path.join(app.getPath('userData'), 'certs')
    if (!fs.existsSync(this.certDir)) {
      fs.mkdirSync(this.certDir, { recursive: true })
    }
  }

  public getCaPath() {
    return path.join(this.certDir, 'ca.crt')
  }

  /**
   * 获取服务器证书 (带缓存机制)
   */
  public getAppCredentials(domain: string): { key: string; cert: string } {
    // A. 第一层：内存缓存检查 (最快)
    if (this.certCache.has(domain)) {
      // log.debug(`[Cert] Hit memory cache for ${domain}`);
      return this.certCache.get(domain)!
    }

    // 确保 CA 已加载
    this.ensureCA()

    // B. 第二层：硬盘缓存检查 (防止重启后丢失，可选)
    // 如果你想让证书重启后也保留，可以在这里加 fs.existsSync 读取逻辑
    // 但对于动态代理，通常内存缓存就够了，重启重新生成也没关系

    // C. 第三层：动态生成 (慢，但只执行一次)
    const credentials = this.generateServerCert(domain)

    // 存入缓存
    this.certCache.set(domain, credentials)

    return credentials
  }

  private ensureCA() {
    // 优化：如果内存里已经有 CA 了，直接返回，不再读硬盘
    if (this.caCert && this.caKey) return

    const caCertPath = path.join(this.certDir, 'ca.crt')
    const caKeyPath = path.join(this.certDir, 'ca.key')

    if (fs.existsSync(caCertPath) && fs.existsSync(caKeyPath)) {
      log.info('Loading existing CA from disk...')
      const certPem = fs.readFileSync(caCertPath, 'utf8')
      const keyPem = fs.readFileSync(caKeyPath, 'utf8')
      this.caCert = pki.certificateFromPem(certPem)
      this.caKey = pki.privateKeyFromPem(keyPem)
    } else {
      log.info('Generating NEW CA...')
      const { cert, key, certObj, keyObj } = this.generateRootCA()
      this.caCert = certObj
      this.caKey = keyObj
      fs.writeFileSync(caCertPath, cert)
      fs.writeFileSync(caKeyPath, key)
    }
  }

  private generateServerCert(domain: string) {
    if (!this.caCert || !this.caKey) throw new Error('CA not initialized')

    log.info(`Generating Server certificate for ${domain}...`)

    const keys = pki.rsa.generateKeyPair(2048)
    const cert = pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16))

    // 有效期设置短一点没关系，因为是内存生成的
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1)

    cert.setSubject([
      { name: 'commonName', value: domain },
      { name: 'organizationName', value: 'Ghosxy Proxy' }
    ])
    // 必须使用 CA 的 Subject 作为 Issuer
    cert.setIssuer(this.caCert.subject.attributes)

    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: domain } // DNS Name
        ]
      }
    ])

    cert.sign(this.caKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create())

    return {
      cert: pki.certificateToPem(cert),
      key: pki.privateKeyToPem(keys.privateKey)
    }
  }

  private generateRootCA() {
    const keys = pki.rsa.generateKeyPair(2048)
    const cert = pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16))

    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10)

    const attrs = [
      { name: 'commonName', value: 'Ghosxy Proxy CA' },
      { name: 'organizationName', value: 'Ghosxy' }
    ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.setExtensions([
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true }
    ])

    cert.sign(keys.privateKey, forge.md.sha256.create())

    return {
      cert: pki.certificateToPem(cert),
      key: pki.privateKeyToPem(keys.privateKey),
      certObj: cert,
      keyObj: keys.privateKey
    }
  }

  /**
   * 检查 CA 证书是否已生成
   * @returns 是否已生成
   */
  public isCaGenerated(): boolean {
    const caPath = this.getCaPath()
    return fs.existsSync(caPath)
  }
}

export const certService = new CertService()
