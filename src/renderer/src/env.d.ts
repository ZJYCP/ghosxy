/// <reference types="vite/client" />

// 1. 定义 API 的结构 (必须和 preload.ts 暴露的一致)
interface IElectronAPI {
  startProxy: () => Promise<void>
  stopProxy: () => Promise<void>
  setHosts: () => Promise<void>
  removeHosts: () => Promise<void>
  trustCertificate: () => Promise<void>
  untrustCertificate: () => Promise<void>
  getProviders: () => Promise<Provider[]>
  addProvider: (provider: Omit<Provider, 'id'>) => Promise<Provider>
  updateProvider: (provider: { id: string } & Partial<Omit<Provider, 'id'>>) => Promise<boolean>
  deleteProvider: (id: string) => Promise<boolean>
  // Rules
  getRules: () => Promise<Rule[]>
  addRule: (rule: Omit<Rule, 'id'>) => Promise<Rule>
  updateRule: (rule: { id: string } & Partial<Omit<Rule, 'id'>>) => Promise<boolean>
  deleteRule: (id: string) => Promise<boolean>
  // App Status
  getAppStatus: () => Promise<{
    proxyRunning: boolean
    hostsModified: boolean
    caGenerated: boolean
  }>
  // Hosts Status
  checkHostsStatus: (domains: string[]) => Promise<Record<string, boolean>>
  getLogHistory: () => Promise<LogEntry[]>
  clearLogs: () => Promise<boolean>
  openLogFolder: () => Promise<void>
  onLogUpdate: (callback: (entry: LogEntry) => void) => () => void
}

// 2. 扩展全局 Window 接口
declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

export {}
