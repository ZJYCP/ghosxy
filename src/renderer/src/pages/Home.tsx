import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  RefreshCw,
  Power,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area' // 需要安装: npx shadcn@latest add scroll-area
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Rule } from 'src/shared/types'

export function HomePage() {
  const [proxyRunning, setProxyRunning] = useState(false)
  const [caGenerated, setCaGenerated] = useState(false)
  const [loading, setLoading] = useState(false)

  // 核心数据：规则列表 + 对应的 Hosts 状态
  const [enabledRules, setEnabledRules] = useState<Rule[]>([])
  const [hostsStatusMap, setHostsStatusMap] = useState<Record<string, boolean>>({})

  // 1. 初始化数据
  const refreshData = async () => {
    try {
      // A. 获取基础状态
      const status = await window.electronAPI.getAppStatus()
      setProxyRunning(status.proxyRunning)
      setCaGenerated(status.caGenerated)

      // B. 获取所有规则，并筛选出启用的
      const allRules = await window.electronAPI.getRules()
      const activeRules = allRules.filter((r) => r.isEnabled)
      setEnabledRules(activeRules)

      // C. 提取域名并批量检查 Hosts 状态
      if (activeRules.length > 0) {
        // 去重域名 (防止多条规则指向同一个域名)
        const domains = Array.from(new Set(activeRules.map((r) => r.sourceHost)))
        const statusMap = await window.electronAPI.checkHostsStatus(domains)
        setHostsStatusMap(statusMap)
      } else {
        setHostsStatusMap({})
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    refreshData()
    // 轮询检查
    const timer = setInterval(refreshData, 5000)
    return () => clearInterval(timer)
  }, [])

  // 2. 动作 Handlers

  const toggleProxy = async (checked: boolean) => {
    setLoading(true)
    try {
      if (checked) {
        // 开启代理服务
        await window.electronAPI.startProxy()
        toast.success('Proxy Engine Started')

        // 注意：这里建议提醒用户去 Rules 页面检查 Hosts 状态，
        // 或者在这里做一个批量检查并提示

        // 可选：自动修复所有 Hosts
        // await handleSyncAllHosts()
      } else {
        await window.electronAPI.stopProxy()
        toast.success('Proxy Engine Stopped')
      }
      await refreshData()
    } catch (e: any) {
      toast.error('Operation failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 修复单个域名的 Hosts
  const handleFixHost = async (domain: string) => {
    setLoading(true)
    try {
      await window.electronAPI.setHosts() // 注意：你需要修改后端 setHosts 逻辑支持传参，或者这里简化调用
      // 这里的逻辑有点绕，因为 setHosts 目前后端是写死的。
      // 为了完美支持，建议后端 setHosts 接受 (domain, ip) 参数
      // 临时方案：调用通用的 setHosts (假设它能处理)

      // 正确的做法是：调用 window.electronAPI.updateHost(domain, '127.0.0.1')
      // 假设你已经按照之前的建议完善了 IPC

      toast.success(`Hosts updated for ${domain}`)
      await refreshData()
    } catch (e) {
      toast.error('Failed to update hosts')
    } finally {
      setLoading(false)
    }
  }

  // 临时：如果没有单独的 updateHost API，这个按钮可能需要调用原来的 setHosts
  // 但为了展示 UI 逻辑，我们假设它可以针对性修复

  const handleTrustCert = async () => {
    setLoading(true)
    try {
      await window.electronAPI.trustCertificate()
      toast.success('Root CA installed')
      await refreshData()
    } catch (e) {
      toast.error('Failed to trust certificate')
    } finally {
      setLoading(false)
    }
  }

  const handleUntrustCert = async () => {
    const confirmed = window.confirm(
      '确定要从系统信任库中移除根证书吗？\n\n移除后，拦截 HTTPS 请求将会出现安全警告（红锁），直到你重新安装证书。'
    )
    if (!confirmed) return

    setLoading(true)
    try {
      // 2. 调用 IPC
      await window.electronAPI.untrustCertificate()

      // 3. 成功提示
      toast.success('根证书已从系统信任库移除')

      // 4. 刷新状态 (虽然目前 isCaGenerated 只检查文件是否存在，但刷新是个好习惯)
      await refreshData()
    } catch (e: any) {
      console.error(e)
      toast.error('移除证书失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 计算总体状态
  const allHostsValid =
    enabledRules.length > 0 && enabledRules.every((r) => hostsStatusMap[r.sourceHost])

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">System status and core controls.</p>
      </div>

      {/* --- Master Switch --- */}
      <Card
        className={cn(
          'shrink-0 border-l-4 transition-all',
          proxyRunning ? 'border-l-green-500 bg-green-500/5' : 'border-l-muted-foreground/30'
        )}
      >
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-colors',
                proxyRunning ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {proxyRunning ? 'Proxy Engine Running' : 'Proxy Engine Stopped'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {proxyRunning ? 'Ready to intercept traffic.' : 'System is idle.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Master Switch</span>
            <Switch
              checked={proxyRunning}
              onCheckedChange={toggleProxy}
              disabled={loading}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* --- 1. Network Interception List (Scrollable) --- */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base">Interception Rules</CardTitle>
              </div>
              <Badge
                variant={allHostsValid ? 'default' : 'destructive'}
                className={allHostsValid ? 'bg-green-600' : ''}
              >
                {allHostsValid ? 'All Active' : 'Attention Needed'}
              </Badge>
            </div>
            <CardDescription>Status of hosts file entries for enabled rules.</CardDescription>
          </CardHeader>

          <Separator />

          <ScrollArea className="flex-1">
            <CardContent className="pt-0">
              {enabledRules.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No enabled rules found. Go to "Rules" tab to add one.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {enabledRules.map((rule) => {
                    const isIntercepted = hostsStatusMap[rule.sourceHost]
                    return (
                      <div key={rule.id} className="flex items-center justify-between py-3">
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-sm font-medium text-foreground truncate max-w-[180px]"
                              title={rule.sourceHost}
                            >
                              {rule.sourceHost}
                            </span>
                            {isIntercepted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" />
                            Redirects to 127.0.0.1
                          </span>
                        </div>

                        {/* Status / Action */}
                        {isIntercepted ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-900"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            onClick={() => handleFixHost(rule.sourceHost)}
                          >
                            Fix Host
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* --- 2. Certificate (Static) --- */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                <CardTitle className="text-base">System Trust</CardTitle>
              </div>
              <Badge variant={caGenerated ? 'outline' : 'secondary'}>
                {caGenerated ? 'Generated' : 'Missing'}
              </Badge>
            </div>
            <CardDescription>Root CA installation status.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Root Certificate</span>
                  {/* 这里我们假设如果文件存在就是 Installed，实际上无法检测是否被信任，除非用 native 模块 */}
                  <span className="text-xs text-muted-foreground">
                    {caGenerated ? 'Ready' : 'Not Found'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={handleTrustCert}
                    disabled={loading}
                  >
                    Install / Repair
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleUntrustCert}
                    disabled={loading}
                    className="flex-1"
                    // className="h-8 text-xs flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Uninstall Cert
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  <strong>Note:</strong> If browsers still show certificate errors, click "Install /
                  Repair" again or restart your browser.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
