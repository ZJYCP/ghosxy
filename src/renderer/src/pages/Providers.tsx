import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, MoreVertical, Server, Key, Trash2, Edit2, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Provider } from 'src/shared/types'
import { cn } from '@/lib/utils' // 确保引入 cn

const DEFAULT_FORM: Omit<Provider, 'id'> = {
  name: '',
  type: 'openai',
  baseUrl: 'https://',
  apiKey: ''
}

export function ProvidersPage() {
  const { t } = useTranslation()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

  // Form State
  const [formData, setFormData] = useState<Omit<Provider, 'id'>>(DEFAULT_FORM)

  // 1. Load Data
  const loadProviders = async () => {
    try {
      setLoading(true)
      const data = await window.electronAPI.getProviders()
      setProviders(data)
    } catch (error) {
      toast.error(t('providers.messages.load_failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  // 2. Handlers
  const handleOpenAdd = () => {
    setEditingProvider(null)
    setFormData(DEFAULT_FORM)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setFormData({
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('providers.delete_confirm'))) return

    try {
      await window.electronAPI.deleteProvider(id)
      toast(t('providers.messages.deleted'))
      loadProviders()
    } catch (error) {
      toast.error(t('providers.messages.delete_failed'))
    }
  }

  const handleSubmit = async () => {
    // Basic Validation
    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      toast.error(t('providers.messages.required_fields'))
      return
    }

    try {
      setIsSubmitting(true)
      if (editingProvider) {
        // Edit Mode
        await window.electronAPI.updateProvider({
          id: editingProvider.id,
          ...formData
        })
        toast.success(t('providers.messages.updated'))
      } else {
        // Add Mode
        await window.electronAPI.addProvider(formData)
        toast.success(t('providers.messages.added'))
      }
      setIsDialogOpen(false)
      loadProviders()
    } catch (error) {
      toast.error(t('providers.messages.operation_failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to mask API Key
  const maskKey = (key?: string) => {
    if (!key) return null
    if (key.length <= 8) return '********'
    return `${key.slice(0, 3)}...${key.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('providers.title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('providers.subtitle')}</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6 shadow-lg shadow-blue-900/20 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> {t('providers.add_btn')}
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="group relative bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all duration-300"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                    provider.type === 'openai'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  )}
                >
                  {provider.type === 'openai' ? (
                    <Globe className="w-5 h-5" />
                  ) : (
                    <Server className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{provider.name}</h3>
                  <div className="flex items-center text-xs mt-0.5 space-x-2">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] uppercase font-medium tracking-wider border',
                        provider.apiKey
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                      )}
                    >
                      {provider.apiKey ? t('providers.secured') : t('providers.no_auth')}
                    </span>
                    <span className="text-muted-foreground uppercase text-[10px]">
                      {provider.type}
                    </span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent data-[state=open]:bg-accent"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-popover border-border text-popover-foreground"
                >
                  <DropdownMenuItem
                    onClick={() => handleOpenEdit(provider)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 mr-2 text-blue-500" /> {t('providers.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(provider.id)}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> {t('providers.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Details Section */}
            <div className="space-y-3">
              {/* URL */}
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border group-hover:border-primary/20 transition-colors">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  {t('providers.base_url')}
                </div>
                <div
                  className="text-xs text-foreground font-mono truncate select-all"
                  title={provider.baseUrl}
                >
                  {provider.baseUrl}
                </div>
              </div>

              {/* API Key Status */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Key className="w-3.5 h-3.5" />
                  <span>{t('providers.api_credentials')}</span>
                </div>
                <div className="text-xs font-mono text-foreground/80">
                  {maskKey(provider.apiKey) || (
                    <span className="text-muted-foreground italic">{t('providers.none')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!loading && providers.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
            <Server className="w-10 h-10 mb-3 opacity-20" />
            <p>{t('providers.no_providers')}</p>
            <Button variant="link" onClick={handleOpenAdd} className="text-blue-500">
              {t('providers.create_first')}
            </Button>
          </div>
        )}
      </div>

      {/* --- Add/Edit Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? t('providers.dialog.title_edit') : t('providers.dialog.title_new')}
            </DialogTitle>
            <DialogDescription>{t('providers.dialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Name & Type */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>
                  {t('providers.dialog.provider_name')}{' '}
                  <span className="text-destructive">{t('providers.dialog.provider_name_required')}</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('providers.dialog.name_placeholder')}
                  className="bg-background"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('providers.dialog.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{t('providers.dialog.type_custom')}</SelectItem>
                    <SelectItem value="openai">{t('providers.dialog.type_openai')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label>
                {t('providers.dialog.base_url_required', { defaultValue: 'Base URL' })}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder={t('providers.dialog.base_url_placeholder')}
                  className="bg-background pl-9 font-mono text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('providers.dialog.base_url_note')}
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>{t('providers.dialog.api_key')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={t('providers.dialog.api_key_placeholder')}
                  className="bg-background pl-9 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              {t('providers.dialog.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white min-w-[80px]"
            >
              {isSubmitting ? t('providers.dialog.saving') : t('providers.dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
