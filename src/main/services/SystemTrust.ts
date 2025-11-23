import sudo from 'sudo-prompt'
import log from 'electron-log'

const EXEC_OPTS = { name: 'Ghosxy' }

export class SystemTrustService {
  public trust(certPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = `certutil.exe -addstore -f "ROOT" "${certPath}"`
      sudo.exec(command, EXEC_OPTS, (error, stdout) => {
        if (error) {
          log.error('Trust Cert Error:', error)
          reject(error)
        } else {
          log.info('Trust Cert Success:', stdout)
          resolve()
        }
      })
    })
  }

  public untrust(certPath: string): Promise<void> {
    // 注意：Certutil 通常用 Common Name 删除，例如: certutil -delstore "ROOT" "Ghosxy CA"
    // 如果用文件路径删除失败，请将下行改为: `certutil.exe -delstore "ROOT" "Ghosxy CA"`
    const command = `certutil.exe -delstore "ROOT" "${certPath}"`

    return new Promise((resolve, reject) => {
      sudo.exec(command, EXEC_OPTS, (error, stdout) => {
        if (error) {
          log.error('Untrust Cert Error:', error)
          reject(error)
        } else {
          log.info('Untrust Cert Success:', stdout)
          resolve()
        }
      })
    })
  }
}

export const systemTrustService = new SystemTrustService()
