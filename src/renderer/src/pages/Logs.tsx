import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, FolderOpen, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { LogEntry } from 'src/shared/types'
import { cn } from '@/lib/utils'

export function LogsPage() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const viewportRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(false) // 默认关闭自动滚动,因为最新日志在顶部

  // 1. 初始化 - 加载历史日志并反转顺序(最新的在前)
  useEffect(() => {
    window.electronAPI.getLogHistory().then((history) => {
      setLogs([...history].reverse()) // 反转数组,最新的在顶部
    })
  }, [])

  // 2. 监听新日志
  useEffect(() => {
    const removeListener = window.electronAPI.onLogUpdate((entry) => {
      setLogs((prev) => [entry, ...prev]) // 将新日志添加到数组开头
    })
    return () => removeListener()
  }, [])

  // 3. 自动滚动到顶部 (最新日志)
  useEffect(() => {
    if (autoScroll && viewportRef.current) {
      // 这里的 selector 针对 Shadcn UI 的 ScrollArea 内部结构
      const scrollContainer = viewportRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollTop = 0 // 滚动到顶部
      }
    }
  }, [logs, autoScroll])

  const handleClear = async () => {
    if (!confirm(t('logs.clear_confirm'))) return
    await window.electronAPI.clearLogs()
    setLogs([])
    toast.success(t('logs.messages.cleared'))
  }

  const handleOpenFolder = () => window.electronAPI.openLogFolder()

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.text}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success(t('logs.messages.copied'))
  }

  // Helper 1: 安全的时间格式化 (修复报错的核心)
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '--:--:--'
    try {
      // 情况 A: ISO 格式 (2023-11-24T12:00:00)
      if (timestamp.includes('T')) {
        return timestamp.split('T')[1].split('.')[0]
      }
      // 情况 B: 普通日志格式 (2023-11-24 12:00:00)
      if (timestamp.includes(' ')) {
        return timestamp.split(' ')[1].split('.')[0]
      }
      // 情况 C: 未知格式，直接返回，防止崩溃
      return timestamp
    } catch (e) {
      return timestamp
    }
  }

  // Helper 2: 颜色映射
  const getLevelColor = (level: string) => {
    const l = level ? level.toLowerCase() : 'info'
    switch (l) {
      case 'error':
        return 'text-red-500'
      case 'warn':
        return 'text-yellow-500'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-zinc-400'
    }
  }

  return (
    <div className="h-full flex flex-col space-y-4 max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('logs.title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('logs.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenFolder}>
            <FolderOpen className="w-4 h-4 mr-2" /> {t('logs.local')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" /> {t('logs.copy')}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" /> {t('logs.clear')}
          </Button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 min-h-0 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col shadow-inner">
        {/* Terminal Header */}
        <div className="h-9 shrink-0 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">{t('logs.file_name')}</div>
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <span className="text-[10px] text-zinc-500">{t('logs.auto_scroll')}</span>
            <div
              className={cn('w-2 h-2 rounded-full', autoScroll ? 'bg-green-500' : 'bg-zinc-700')}
            />
          </div>
        </div>

        {/* Log Content */}
        <div className="flex-1 min-h-0 overflow-hidden" ref={viewportRef}>
          <ScrollArea className="h-full w-full">
            <div className="p-4 font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-zinc-700 space-y-2 opacity-50">
                  <p>{t('logs.no_logs')}</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="flex gap-3 hover:bg-white/5 p-0.5 rounded px-1 transition-colors break-all"
                  >
                    {/* 使用新的安全格式化函数 */}
                    <span className="text-zinc-600 shrink-0 select-none w-[130px]">
                      {formatTime(log.timestamp)}
                    </span>

                    <span
                      className={cn(
                        'uppercase font-bold w-[45px] shrink-0 text-center text-[10px] py-0.5 rounded bg-white/5',
                        getLevelColor(log.level)
                      )}
                    >
                      {log.level || 'INFO'}
                    </span>

                    <span className="text-zinc-300">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
