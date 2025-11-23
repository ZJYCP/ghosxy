const { contextBridge, ipcRenderer, IpcRendererEvent } = require('electron')
import { LogEntry } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),
  setHosts: () => ipcRenderer.invoke('set-hosts'),
  removeHosts: () => ipcRenderer.invoke('remove-hosts'),
  trustCertificate: () => ipcRenderer.invoke('trust-certificate'),
  untrustCertificate: () => ipcRenderer.invoke('untrust-certificate'),
  startProxy: (targetUrl: string) => ipcRenderer.invoke('start-proxy', targetUrl),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
  getProviders: () => ipcRenderer.invoke('store:get-providers'),
  addProvider: (p) => ipcRenderer.invoke('store:add-provider', p),
  updateProvider: (p) => ipcRenderer.invoke('store:update-provider', p),
  deleteProvider: (id) => ipcRenderer.invoke('store:delete-provider', id),
  // Rules
  getRules: () => ipcRenderer.invoke('store:get-rules'),
  addRule: (rule) => ipcRenderer.invoke('store:add-rule', rule),
  updateRule: (rule) => ipcRenderer.invoke('store:update-rule', rule),
  deleteRule: (id) => ipcRenderer.invoke('store:delete-rule', id),
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  checkHostsStatus: (domains: string[]) => ipcRenderer.invoke('hosts:check-status', domains),
  // Logs
  getLogHistory: () => ipcRenderer.invoke('logs:get-history'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  openLogFolder: () => ipcRenderer.invoke('logs:open-folder'),

  // 实时监听日志更新
  onLogUpdate: (callback: (entry: LogEntry) => void) => {
    const subscription = (_event: typeof IpcRendererEvent, entry: LogEntry) => callback(entry)
    ipcRenderer.on('log:update', subscription)
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('log:update', subscription)
    }
  }
})
