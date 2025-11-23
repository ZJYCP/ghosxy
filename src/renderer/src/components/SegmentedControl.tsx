import { cn } from '@/lib/utils'

interface SegmentedControlProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
              isActive
                ? 'bg-background text-primary shadow-sm border border-border/50' // 选中态：白色/黑色背景 + 阴影
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50' // 未选中态
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
