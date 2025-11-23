import * as forge from 'node-forge'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import log from 'electron-log'

const pki = forge.pki

export class CertService {
  private certDir: string
  private caCert: forge.pki.Certificate | null = null
  private caKey: forge.pki.PrivateKey | null = null

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
   * 获取服务器证书和Key
   * 如果 CA 不存在则自动生成，如果 Server 证书不存在则自动签发
   */
  public getAppCredentials(domain: string = 'api.openai.com'): { key: string; cert: string } {
    this.ensureCA()
    return this.generateServerCert(domain)
  }

  private ensureCA() {
    const caCertPath = path.join(this.certDir, 'ca.crt')
    const caKeyPath = path.join(this.certDir, 'ca.key')

    if (fs.existsSync(caCertPath) && fs.existsSync(caKeyPath)) {
      log.info('Loading existing CA...')
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
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1)

    cert.setSubject([
      { name: 'commonName', value: domain },
      { name: 'organizationName', value: 'Ghosxy App' }
    ])
    cert.setIssuer(this.caCert.subject.attributes)
    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: domain }] }
    ])
    cert.sign(this.caKey, forge.md.sha256.create())

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
      { name: 'commonName', value: 'Ghosxy CA' },
      { name: 'organizationName', value: 'Ghosxy App' }
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
