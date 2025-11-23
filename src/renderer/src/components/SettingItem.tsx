import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// 负责渲染左侧文字 + 右侧任意控件
interface SettingItemProps {
  label: string
  description?: string // 可选的辅助说明文字
  icon?: React.ReactNode // 可选的左侧图标
  children: React.ReactNode // 右侧的开关、下拉框等
  className?: string
}

export function SettingItem({ label, description, icon, children, className }: SettingItemProps) {
  return (
    <div className={cn('flex items-center justify-between py-4 px-1', className)}>
      <div className="flex items-center gap-3 overflow-hidden">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <div className="flex flex-col gap-1">
          <Label className="text-base font-normal text-foreground leading-none">{label}</Label>
          {description && (
            <span className="text-xs text-muted-foreground truncate">{description}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-4">{children}</div>
    </div>
  )
}
