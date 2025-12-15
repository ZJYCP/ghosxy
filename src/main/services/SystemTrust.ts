import sudo from 'sudo-prompt'
import log from 'electron-log'
import os from 'os'

const EXEC_OPTS = { name: 'Ghosxy' }

export class SystemTrustService {
  /**
   * 根据平台选择正确的命令安装根证书
   */
  public trust(certPath: string): Promise<void> {
    const platform = os.platform()
    let command: string

    switch (platform) {
      case 'win32':
        // Windows: 使用 certutil
        command = `certutil.exe -addstore -f "ROOT" "${certPath}"`
        break

      case 'darwin': {
        // macOS: 使用 security 命令
        // -k /Library/Keychains/System.keychain: 安装到系统钥匙串
        // -t: 信任设置 (trustRoot, trustAsRoot)
        // 转义路径中的空格，sudo-prompt 通过 AppleScript 执行时需要
        const escapedPath = certPath.replace(/ /g, '\\ ')
        command = `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${escapedPath}`
        break
      }

      case 'linux':
        // Linux: 复制到系统证书目录并更新
        // 注意: 不同发行版可能有差异,这里使用最通用的方法
        command = `cp "${certPath}" /usr/local/share/ca-certificates/ghosxy-ca.crt && update-ca-certificates`
        break

      default:
        return Promise.reject(new Error(`Unsupported platform: ${platform}`))
    }

    return new Promise((resolve, reject) => {
      sudo.exec(command, EXEC_OPTS, (error, stdout) => {
        if (error) {
          log.error(`Trust Cert Error (${platform}):`, error)
          reject(error)
        } else {
          log.info(`Trust Cert Success (${platform}):`, stdout)
          resolve()
        }
      })
    })
  }

  /**
   * 根据平台选择正确的命令卸载根证书
   */
  public untrust(_certPath: string): Promise<void> {
    const platform = os.platform()
    let command: string

    switch (platform) {
      case 'win32':
        // Windows: 通过 Common Name 删除
        // 注意: certutil 通常使用 CN 而不是路径删除
        command = `certutil.exe -delstore "ROOT" "Ghosxy Proxy CA"`
        break

      case 'darwin':
        // macOS: 使用 security 命令删除
        // 需要先找到证书的 SHA-1 哈希,然后删除
        // 简化版本: 直接通过 Common Name 删除
        command = `security delete-certificate -c "Ghosxy Proxy CA" /Library/Keychains/System.keychain`
        break

      case 'linux':
        // Linux: 删除证书文件并更新
        command = `rm -f /usr/local/share/ca-certificates/ghosxy-ca.crt && update-ca-certificates --fresh`
        break

      default:
        return Promise.reject(new Error(`Unsupported platform: ${platform}`))
    }

    return new Promise((resolve, reject) => {
      sudo.exec(command, EXEC_OPTS, (error, stdout) => {
        if (error) {
          log.error(`Untrust Cert Error (${platform}):`, error)
          reject(error)
        } else {
          log.info(`Untrust Cert Success (${platform}):`, stdout)
          resolve()
        }
      })
    })
  }
}

export const systemTrustService = new SystemTrustService()
