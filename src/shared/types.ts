export interface Provider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'gemini' | 'custom'
  baseUrl: string
  apiKey?: string
}
// 定义模型映射子结构
export interface ModelMapping {
  from: string // 原模型ID (例如 gpt-4)
  to: string // 目标模型ID (例如 llama3)
}

// 定义核心 Rule 类型
export interface Rule {
  id: string // 唯一标识 (UUID)
  isEnabled: boolean // 开关状态：是否启用该规则
  sourceHost: string // 拦截源域名 (例如 api.openai.com)
  targetProviderId: string // 指向的 Provider ID (关联关系)
  modelMappings: ModelMapping[] // 模型转换列表
}

export interface SystemStatus {
  proxyRunning: boolean // 代理服务是否在运行
  hostsModified: boolean // Hosts 是否已被修改
  caGenerated: boolean // CA 证书文件是否已生成
  // caTrusted: boolean;      // CA 是否被系统信任 (检测较难，通常由用户确认)
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'verbose'
  text: string
  raw: string // 原始完整字符串
}
