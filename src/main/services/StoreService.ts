import Store from 'electron-store'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { Provider, Rule } from '../../shared/types'

interface Schema {
  providers: Provider[]
  rules: Rule[]
}

class StoreService {
  private store: Store<Schema>

  constructor() {
    this.store = new Store<Schema>({
      name: 'ghosxy-config', // 配置文件名为 ghosxy-config.json
      defaults: {
        providers: [
          {
            id: 'default',
            name: 'Official OpenAI',
            type: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: ''
          }
        ],
        rules: []
      }
    })
    log.info('Store initialized at:', app.getPath('userData'))
  }

  // --- Providers CRUD ---

  public getProviders(): Provider[] {
    // log providers
    return this.store.get('providers')
  }

  public addProvider(provider: Omit<Provider, 'id'>): Provider {
    const providers = this.getProviders()
    const newProvider = { ...provider, id: uuidv4() }
    this.store.set('providers', [...providers, newProvider])
    return newProvider
  }

  public updateProvider(id: string, updates: Partial<Omit<Provider, 'id'>>): boolean {
    const providers = this.getProviders()
    const index = providers.findIndex((p) => p.id === id)
    if (index === -1) return false

    providers[index] = { ...providers[index], ...updates }
    this.store.set('providers', providers)
    return true
  }

  public deleteProvider(id: string): boolean {
    const providers = this.getProviders()
    const filtered = providers.filter((p) => p.id !== id)
    if (filtered.length === providers.length) return false

    this.store.set('providers', filtered)
    return true
  }

  // 供 ProxyService 调用：根据 ID 获取 Provider 信息
  public getProviderById(id: string): Provider | undefined {
    return this.getProviders().find((p) => p.id === id)
  }
  // --- Rules CRUD (新增部分) ---

  public getRules(): Rule[] {
    return this.store.get('rules') || []
  }

  public addRule(rule: Omit<Rule, 'id'>): Rule {
    const rules = this.getRules()
    const newRule = { ...rule, id: uuidv4() }
    this.store.set('rules', [...rules, newRule])
    log.info(`[Store] Added rule: ${newRule.id}`)
    return newRule
  }

  public updateRule(id: string, updates: Partial<Omit<Rule, 'id'>>): boolean {
    const rules = this.getRules()
    const index = rules.findIndex((r) => r.id === id)
    if (index === -1) return false

    // 深度合并对象
    rules[index] = { ...rules[index], ...updates }
    this.store.set('rules', rules)
    log.info(`[Store] Updated rule: ${id}`)
    return true
  }

  public deleteRule(id: string): boolean {
    const rules = this.getRules()
    const filtered = rules.filter((r) => r.id !== id)
    this.store.set('rules', filtered)
    log.info(`[Store] Deleted rule: ${id}`)
    return true
  }
}

export const storeService = new StoreService()
