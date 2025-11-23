import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import log from 'electron-log'
import { proxyService } from './services/ProxyService'
import { certService } from './services/CertService'
import { systemTrustService } from './services/SystemTrust'
import { hostsService } from './services/HostsService'
import { storeService } from './services/StoreService'
import { logService } from './services/LogService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ghosxy')

  // --- IPC Handlers ---

  // 1. 代理服务控制
  ipcMain.handle('start-proxy', async () => {
    // 1. 启动代理 (加载所有规则)
    await proxyService.start()

    // 2. (可选) 自动设置 Hosts
    // 如果你想做得更智能，可以在这里遍历所有 enabled rules 并自动调用 hostsService
    // const rules = storeService.getRules().filter(r => r.isEnabled);
    // for (const rule of rules) {
    //   await hostsService.set(rule.sourceHost, '127.0.0.1');
    // }

    return true
  })
  ipcMain.handle('stop-proxy', async () => proxyService.stop())

  // 2. 证书信任控制
  ipcMain.handle('trust-certificate', async () => {
    const path = certService.getCaPath()
    return systemTrustService.trust(path)
  })
  ipcMain.handle('untrust-certificate', async () => {
    const path = certService.getCaPath()
    return systemTrustService.untrust(path)
  })

  // 3. 【新增】Hosts 控制
  // 这里硬编码了 api.openai.com，也可以让前端传过来
  const TARGET_DOMAIN = 'api.openai.com'

  ipcMain.handle('set-hosts', async () => {
    // 调用 hostsService，将域名指向 127.0.0.1
    return hostsService.set(TARGET_DOMAIN, '127.0.0.1')
  })

  ipcMain.handle('remove-hosts', async () => {
    // 调用 hostsService，移除该域名的劫持
    return hostsService.remove(TARGET_DOMAIN, '127.0.0.1')
  })

  // --- Store IPC Handlers ---
  ipcMain.handle('store:get-providers', () => storeService.getProviders())

  ipcMain.handle('store:add-provider', (_, provider) => storeService.addProvider(provider))

  ipcMain.handle('store:update-provider', (_, { id, ...updates }) =>
    storeService.updateProvider(id, updates)
  )

  ipcMain.handle('store:delete-provider', (_, id) => storeService.deleteProvider(id))

  // --- Rule IPC Handlers ---
  ipcMain.handle('store:get-rules', () => storeService.getRules())

  ipcMain.handle('store:add-rule', (_, rule) => storeService.addRule(rule))

  ipcMain.handle('store:update-rule', (_, { id, ...updates }) =>
    storeService.updateRule(id, updates)
  )

  ipcMain.handle('store:delete-rule', (_, id) => storeService.deleteRule(id))

  // 聚合状态查询
  ipcMain.handle('app:get-status', async () => {
    return {
      proxyRunning: proxyService.isRunning(),
      hostsModified: hostsService.checkStatus('api.openai.com'), // 硬编码或读取配置
      caGenerated: certService.isCaGenerated()
    }
  })

  /**
   * 检查多个域名的 hosts 状态
   * @param domains 要检查的域名数组
   * @returns 每个域名的状态记录
   */
  ipcMain.handle('hosts:check-status', async (_, domains: string[]) => {
    const result: Record<string, boolean> = {}
    for (const domain of domains) {
      result[domain] = hostsService.checkStatus(domain)
    }
    return result
  })
  // --- Logs IPC ---
  ipcMain.handle('logs:get-history', () => logService.getHistory())
  ipcMain.handle('logs:clear', () => logService.clearLogs())

  // 打开日志文件所在文件夹 (实用功能)
  ipcMain.handle('logs:open-folder', () => {
    // electron-log 提供了获取路径的方法
    const { shell } = require('electron')
    const logPath = require('electron-log').transports.file.getFile().path
    shell.showItemInFolder(logPath)
  })
  createWindow()
})

// 当所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 当应用准备退出时 (无论是 Cmd+Q 还是窗口全关)
app.on('will-quit', async (event) => {
  log.info('App is quitting, cleaning up...')

  // 这里有个小坑：will-quit 是同步的，如果我们要执行异步操作(如 sudo)，
  // 有时候来不及执行完应用就关了。
  // 但对于 hosts 修改，尽可能尝试去恢复。

  try {
    // 尝试停止代理端口监听
    await proxyService.stop()
    // 【重要】尝试移除 hosts 条目，防止用户下次开机连不上网
    // 注意：这会弹窗要权限，体验稍差，但比断网好。
    // 如果想要无感，可以在 hostsService 里做检查：如果没修改过就不弹窗。
    const TARGET_DOMAIN = 'api.openai.com'
    await hostsService.remove(TARGET_DOMAIN, '127.0.0.1')
  } catch (e) {
    log.error('Cleanup failed:', e)
  }
})
