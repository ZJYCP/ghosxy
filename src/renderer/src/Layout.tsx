import { Layers, Network, Settings, Activity, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (id: string) => void
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { t } = useTranslation()
  const navItems = [
    { id: 'home', label: t('nav.home'), icon: LayoutDashboard },
    { id: 'rules', label: t('nav.rules'), icon: Network },
    { id: 'providers', label: t('nav.providers'), icon: Layers },
    { id: 'logs', label: t('nav.logs'), icon: Activity },
    { id: 'settings', label: t('nav.settings'), icon: Settings }
  ]
  return (
    // 使用 bg-background 确保背景跟随主题
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-blue-500/30">
      {/* --- Left Sidebar --- */}
      <aside className="w-64 shrink-0 bg-muted/40 border-r border-border flex flex-col">
        {/* App Logo/Title */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
            {/* Logo 保持白色，因为背景始终是蓝色 */}
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">{t('app.name')}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon
                  className={cn('w-5 h-5', isActive ? 'text-white' : 'text-muted-foreground')}
                />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Status Footer (Optional) */}
        <div className="p-4 border-t border-border">
          <div className="bg-background/80 border border-border rounded-lg p-3 text-xs text-muted-foreground flex justify-between items-center shadow-sm">
            <span>{t('app.core')}: v1.0.0</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* --- Right Content --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}
