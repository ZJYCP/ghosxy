import log from 'electron-log'
import fs from 'fs'
import { BrowserWindow } from 'electron'
import { LogEntry } from '../../shared/types'

class LogService {
  private logFile: string

  constructor() {
    // 1. 获取 electron-log 的文件路径
    // 通常在 AppData/YourApp/logs/main.log
    this.logFile = log.transports.file.getFile().path

    this.logFile = log.transports.file.getFile().path

    //启动时立即清空旧日志
    this.clearLogs()

    // 2. 配置格式 (为了方便解析，保持默认或微调)
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

    // 3. 设置实时钩子：当有日志打印时，同时发送给前端
    // @ts-ignore: electron-log 类型定义在 hook 上可能不完整
    log.hooks.push((message, transport) => {
      if (transport !== log.transports.file) return message

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: message.level as any,
        text: message.data.map((d) => String(d)).join(' '),
        raw: '' // 实时消息可以由前端组装
      }

      // 发送给所有窗口
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('log:update', entry)
      })

      return message
    })

    log.info('LogService initialized. Logging to:', this.logFile)
  }

  /**
   * 读取历史日志 (只取最后 N 行，防止卡死)
   */
  public async getHistory(limit: number = 500): Promise<LogEntry[]> {
    if (!fs.existsSync(this.logFile)) return []

    try {
      const content = fs.readFileSync(this.logFile, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim() !== '')

      // 取最后 N 行
      const recentLines = lines.slice(-limit)

      return recentLines.map((line) => this.parseLine(line))
    } catch (e) {
      log.error('Failed to read log history:', e)
      return []
    }
  }

  /**
   * 清空日志文件
   */
  public clearLogs(): boolean {
    try {
      fs.writeFileSync(this.logFile, '')
      log.info('Logs cleared by user.')
      return true
    } catch (e) {
      log.error('Failed to clear logs:', e)
      return false
    }
  }

  /**
   * 简单的日志解析器
   * 将 "[2025-11-23 10:00:00] [info] msg" 解析为对象
   */
  private parseLine(line: string): LogEntry {
    try {
      // 简单正则匹配：[时间] [等级] 内容
      const match = line.match(/^\[(.*?)\] \[(.*?)\] (.*)/)
      if (match) {
        return {
          timestamp: match[1],
          level: match[2] as any,
          text: match[3],
          raw: line
        }
      }
      return { timestamp: '', level: 'info', text: line, raw: line }
    } catch (e) {
      return { timestamp: '', level: 'info', text: line, raw: line }
    }
  }
}

export const logService = new LogService()
