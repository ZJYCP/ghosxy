// src/main/services/HostsService.ts
import sudo from 'sudo-prompt'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'
import fs from 'fs'
import os from 'os'

// 在开发环境和生产环境，资源路径不同
const isDev = !app.isPackaged
const SCRIPT_PATH = isDev
  ? path.join(process.cwd(), 'resources/hosts-helper.js')
  : path.join(process.resourcesPath, 'scripts/hosts-helper.js') // 对应 extraResources 的 "to"

const APP_NAME = 'Ghosxy'

const isWin = os.platform() === 'win32'
const HOSTS_PATH = isWin
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/drivers/etc/hosts')
  : '/etc/hosts'

export class HostsService {
  /**
   * 执行修改 Hosts 的核心方法
   */
  private runSudoCommand(
    action: 'add' | 'remove',
    domain: string,
    ip: string = '127.0.0.1'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 核心魔法：使用当前 Electron 的可执行文件作为 Node 解释器
      // 这样用户不需要安装 Node.js 也能运行
      const binary = process.execPath

      // 构建命令
      // 格式: "path/to/electron" "path/to/script.js" add api.openai.com 127.0.0.1 "App Name"
      const command = `"${binary}" "${SCRIPT_PATH}" ${action} ${domain} ${ip} "${APP_NAME}"`

      const options = {
        name: APP_NAME,
        // 必须设置这个环境变量，否则 Electron 会尝试启动 GUI 而不是运行脚本
        env: { ELECTRON_RUN_AS_NODE: '1' }
      }

      log.info(`Executing hosts command: ${action} ${domain}`)

      sudo.exec(command, options, (error, stdout, stderr) => {
        if (error) {
          log.error('Sudo exec error:', error)
          log.error('Stderr:', stderr)
          reject(error)
        } else {
          log.info('Hosts updated:', stdout)
          resolve()
        }
      })
    })
  }

  /**
   * 检查 Hosts 文件是否已修改
   * @param domain
   * @returns
   */
  public checkStatus(domain: string = 'api.openai.com'): boolean {
    try {
      const content = fs.readFileSync(HOSTS_PATH, 'utf8')
      // 检查是否存在我们的 Marker 或者直接检查域名指向
      // 简单起见，检查是否指向 127.0.0.1 且包含域名
      const regex = new RegExp(`127\\.0\\.0\\.1\\s+${domain.replace(/\./g, '\\.')}`, 'i')
      return regex.test(content)
    } catch (e) {
      // 如果读取失败（权限问题），通常意味着没修改或者是默认状态
      return false
    }
  }

  public async set(domain: string, ip: string): Promise<void> {
    return this.runSudoCommand('add', domain, ip)
  }

  public async remove(domain: string, ip: string): Promise<void> {
    return this.runSudoCommand('remove', domain, ip)
  }
}

export const hostsService = new HostsService()
