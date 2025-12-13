import { Sun, Globe } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/SegmentedControl'
import { SettingItem } from '@/components/SettingItem'
import { useTranslation } from 'react-i18next'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  // 切换语言的处理函数
  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
    // i18next-browser-languagedetector 会自动把这个选择存入 localStorage
    // 下次启动应用会自动读取
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* 设置列表 */}
      <div className="bg-background rounded-xl border border-border shadow-sm divide-y divide-border/60">
        {/* 语言选择 */}
        <SettingItem
          label={t('settings.language')}
          icon={<Globe className="w-4 h-4" />}
          className="px-6"
        >
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文简体</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        {/* 主题选择 */}
        <SettingItem
          label={t('settings.theme')}
          icon={<Sun className="w-4 h-4" />}
          className="px-6"
        >
          <SegmentedControl
            value={theme}
            onChange={(v) => setTheme(v as any)}
            options={[
              { value: 'light', label: t('settings.theme_light') },
              { value: 'dark', label: t('settings.theme_dark') },
              { value: 'system', label: t('settings.theme_system') }
            ]}
          />
        </SettingItem>

        {/* --- 3. 开关类型 (Switch) ---
        <SettingItem label="开机自启" icon={<Power className="w-4 h-4" />} className="px-6">
          <Switch checked={autoStart} onCheckedChange={setAutoStart} />
        </SettingItem>

        <SettingItem
          label="自动检查更新"
          description="有新版本时自动下载"
          icon={<Zap className="w-4 h-4" />}
          className="px-6"
        >
          <Switch checked={checkUpdate} onCheckedChange={setCheckUpdate} />
        </SettingItem>

        <SettingItem
          label="静默启动"
          description="启动时不显示主窗口，仅最小化到托盘"
          className="px-6 pl-[3.25rem]" // 如果没有图标，为了对齐可以使用 padding 或留空
        >
          <Switch checked={silentStart} onCheckedChange={setSilentStart} />
        </SettingItem> */}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        {t('app.name')} v1.0.0 <br />
        {t('settings.footer')}
      </p>
    </div>
  )
}
