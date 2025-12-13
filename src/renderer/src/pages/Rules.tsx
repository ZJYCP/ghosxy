import { useState, useEffect } from 'react'
import { Plus, ArrowRight, ArrowRightLeft, X, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Provider, Rule } from 'src/shared/types'

const PRESET_SOURCES = ['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com']

const DEFAULT_RULE_FORM: Omit<Rule, 'id'> = {
  isEnabled: true,
  sourceHost: '',
  targetProviderId: '',
  modelMappings: []
}

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState<Omit<Rule, 'id'>>(DEFAULT_RULE_FORM)

  // Model Mapping Inputs
  const [mapFrom, setMapFrom] = useState('')
  const [mapTo, setMapTo] = useState('')

  // 1. Load Data
  const loadData = async () => {
    try {
      setLoading(true)
      const [fetchedProviders, fetchedRules] = await Promise.all([
        window.electronAPI.getProviders(),
        window.electronAPI.getRules()
      ])
      setProviders(fetchedProviders)
      setRules(fetchedRules)
    } catch (error) {
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 2. Handlers

  // 打开新增
  const handleOpenAdd = () => {
    setEditingRuleId(null)
    setFormData(DEFAULT_RULE_FORM)
    setMapFrom('')
    setMapTo('')
    setIsDialogOpen(true)
  }

  // 打开编辑
  const handleOpenEdit = (rule: Rule) => {
    setEditingRuleId(rule.id)
    // 深拷贝以防止直接修改原对象
    setFormData({
      isEnabled: rule.isEnabled,
      sourceHost: rule.sourceHost,
      targetProviderId: rule.targetProviderId,
      modelMappings: [...rule.modelMappings]
    })
    setMapFrom('')
    setMapTo('')
    setIsDialogOpen(true)
  }

  // 删除规则
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      await window.electronAPI.deleteRule(id)
      toast.success('Rule deleted')
      loadData()
    } catch (e) {
      toast.error('Failed to delete rule')
    }
  }

  // 提交保存 (新增或更新)
  const handleSaveRule = async () => {
    if (!formData.sourceHost || !formData.targetProviderId) {
      toast.error('Source Host and Target Provider are required')
      return
    }

    try {
      setIsSubmitting(true)

      if (editingRuleId) {
        // 更新逻辑
        await window.electronAPI.updateRule({
          id: editingRuleId,
          ...formData
        })
        toast.success('Rule updated successfully')
      } else {
        // 新增逻辑
        await window.electronAPI.addRule(formData)
        toast.success('Rule added successfully')
      }

      setIsDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error('Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 切换启用状态
  const toggleRule = async (id: string, currentStatus: boolean) => {
    try {
      // 乐观更新 UI
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: !currentStatus } : r)))

      // 调用后端
      await window.electronAPI.updateRule({
        id,
        isEnabled: !currentStatus
      })

      toast.success(currentStatus ? 'Rule disabled' : 'Rule enabled')
    } catch (e) {
      toast.error('Failed to update rule')
      loadData() // 失败回滚
    }
  }

  // Mapping 操作
  const handleAddMapping = () => {
    if (!mapFrom.trim() || !mapTo.trim()) return
    if (formData.modelMappings.some((m) => m.from === mapFrom)) {
      toast.error(`Mapping for ${mapFrom} already exists`)
      return
    }
    setFormData((prev) => ({
      ...prev,
      modelMappings: [...prev.modelMappings, { from: mapFrom, to: mapTo }]
    }))
    setMapFrom('')
    setMapTo('')
  }

  const handleRemoveMapping = (fromModel: string) => {
    setFormData((prev) => ({
      ...prev,
      modelMappings: prev.modelMappings.filter((m) => m.from !== fromModel)
    }))
  }

  const getProviderName = (id: string) => {
    const p = providers.find((p) => p.id === id)
    return p ? p.name : 'Unknown Provider'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Forwarding Rules</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Intercept traffic and map models to providers.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6 shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              'group relative border rounded-2xl p-6 transition-all duration-300',
              rule.isEnabled
                ? 'bg-card border-border hover:border-primary/30 shadow-sm'
                : 'bg-muted/30 border-border/50 opacity-75 grayscale-[0.5]'
            )}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-muted px-4 py-2 rounded-lg border border-border text-foreground font-mono text-sm">
                  https://{rule.sourceHost}
                </div>
                <div className="flex flex-col items-center gap-1 opacity-50">
                  <div className="h-[1px] w-8 bg-border"></div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="h-[1px] w-8 bg-border"></div>
                </div>
                <div className="bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium text-sm flex items-center gap-2">
                  {getProviderName(rule.targetProviderId)}
                </div>
              </div>

              {/* Controls: Switch + Menu */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`switch-${rule.id}`}
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    {rule.isEnabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`switch-${rule.id}`}
                    checked={rule.isEnabled}
                    onCheckedChange={() => toggleRule(rule.id, rule.isEnabled)}
                  />
                </div>

                {/* 操作菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-popover border-border text-popover-foreground"
                  >
                    <DropdownMenuItem
                      onClick={() => handleOpenEdit(rule)}
                      className="cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2 text-blue-500" /> Edit Rule
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(rule.id)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Rule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Model Mappings Display */}
            {rule.modelMappings.length > 0 && (
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="w-3 h-3" /> Model Transformations
                </div>
                <div className="flex flex-wrap gap-2">
                  {rule.modelMappings.map((map, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-background border border-border text-foreground hover:bg-accent font-normal py-1 px-3"
                    >
                      <span className="text-muted-foreground mr-1.5">{map.from}</span>
                      <ArrowRight className="w-3 h-3 text-blue-500 mx-1 inline" />
                      <span className="text-foreground">{map.to}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {rule.modelMappings.length === 0 && (
              <div className="text-xs text-muted-foreground italic px-2">
                No model transformations configured.
              </div>
            )}
          </div>
        ))}

        {!loading && rules.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground">
            No forwarding rules created yet.
          </div>
        )}
      </div>

      {/* --- Add/Edit Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle>{editingRuleId ? 'Edit Routing Rule' : 'New Routing Rule'}</DialogTitle>
            <DialogDescription>
              {editingRuleId
                ? 'Modify existing rule settings.'
                : 'Define traffic interception logic.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Source Host <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.sourceHost}
                  onValueChange={(val) => setFormData({ ...formData, sourceHost: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select or type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SOURCES.map((src) => (
                      <SelectItem key={src} value={src}>
                        {src}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {/* 增加自定义输入的 Input */}
                {formData.sourceHost === 'custom' && (
                  <Input
                    placeholder="Enter hostname (e.g. api.x.com)"
                    className="mt-2 bg-background"
                    onChange={(e) => setFormData({ ...formData, sourceHost: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Target Provider <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.targetProviderId}
                  onValueChange={(val) => setFormData({ ...formData, targetProviderId: val })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Model ID Mapping</Label>
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Incoming</Label>
                    <Input
                      placeholder="gpt-4"
                      className="bg-background h-8 text-sm"
                      value={mapFrom}
                      onChange={(e) => setMapFrom(e.target.value)}
                    />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Target</Label>
                    <Input
                      placeholder="llama3"
                      className="bg-background h-8 text-sm"
                      value={mapTo}
                      onChange={(e) => setMapTo(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddMapping}
                    className="mb-[1px]"
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.modelMappings.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-background px-3 py-2 rounded border border-border text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{m.from}</span>
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                        <span className="text-foreground">{m.to}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMapping(m.from)}
                        className="h-6 w-6 p-0 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
