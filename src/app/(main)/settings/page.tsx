'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'
import { useUiStore } from '@/stores/ui'
import { useEmotionStore } from '@/stores/emotion'
import { useWallpaperStore } from '@/stores/wallpaper'
import { getProviderDefaults } from '@/lib/ai-gateway'
import { maskApiKey } from '@/lib/utils'
import {
  Palette, Music, Bot, Shield, Bell, User, Save, Trash2, KeyRound, Zap, Check, X, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [tab, setTab] = useState('appearance')
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t) setTab(t)
  }, [])
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="mb-4 text-2xl font-bold">设置中心</h1>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap">
          <TabsTrigger value="appearance"><Palette className="h-4 w-4" />外观</TabsTrigger>
          <TabsTrigger value="music"><Music className="h-4 w-4" />音乐</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="h-4 w-4" />AI 接口</TabsTrigger>
          <TabsTrigger value="privacy"><Shield className="h-4 w-4" />隐私</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4" />通知</TabsTrigger>
          <TabsTrigger value="account"><User className="h-4 w-4" />账号</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
        <TabsContent value="music"><MusicTab /></TabsContent>
        <TabsContent value="ai"><AiTab /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="account"><AccountTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const ui = useUiStore()
  return (
    <GlassCard className="space-y-6 p-6">
      <div>
        <Label className="mb-2 block">主题模式</Label>
        <div className="flex gap-2">
          {['light', 'dark', 'system'].map((t) => (
            <Button key={t} variant={theme === t ? 'default' : 'glass'} onClick={() => setTheme(t)}>
              {t === 'light' ? '亮色' : t === 'dark' ? '暗色' : '跟随系统'}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">跟随系统时会根据日出日落自动切换（SunCalc），过渡 300ms 不闪屏</p>
      </div>
      <div>
        <Label className="mb-2 block">玻璃质感强度</Label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((l) => (
            <Button key={l} variant={ui.glassLevel === l ? 'default' : 'glass'} onClick={() => ui.setGlassLevel(l)}>
              {l === 1 ? '轻 (blur-8)' : l === 2 ? '中 (blur-16)' : '重 (blur-24)'}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-2 block">字体大小</Label>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <Button key={s} variant={ui.fontSize === s ? 'default' : 'glass'} onClick={() => ui.setFontSize(s)}>
              {s === 'small' ? '小' : s === 'medium' ? '中' : '大'}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>情绪自适应界面</Label>
          <p className="text-xs text-muted-foreground">根据情绪实时调整主题色、壁纸、音乐</p>
        </div>
        <Switch checked={ui.emotionAdaptive} onCheckedChange={(v) => { ui.setEmotionAdaptive(v); useEmotionStore.getState().setAdaptive(v) }} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>动画效果</Label>
          <p className="text-xs text-muted-foreground">关闭可提升低端设备性能</p>
        </div>
        <Switch checked={ui.animations} onCheckedChange={ui.setAnimations} />
      </div>
    </GlassCard>
  )
}

function MusicTab() {
  const [keyword, setKeyword] = useState('')
  const { data } = useQuery({
    queryKey: ['music-search', keyword],
    queryFn: async () => (await fetch(`/api/music/search?keyword=${encodeURIComponent(keyword)}`).then((r) => r.json())).data,
    enabled: keyword.length > 1,
  })
  return (
    <GlassCard className="space-y-4 p-6">
      <div>
        <Label className="mb-2 block">网易云账号绑定</Label>
        <p className="mb-2 text-xs text-muted-foreground">绑定后可获取每日推荐、创建歌单。Cookie 加密存储。</p>
        <div className="flex gap-2">
          <Input placeholder="粘贴网易云 Cookie" />
          <Button>绑定</Button>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">搜索歌曲</Label>
        <div className="flex gap-2">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="输入歌名或歌手" />
        </div>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {(data ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg surface px-3 py-1.5 text-sm">
              <span className="truncate">{s.name} - {s.artist}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

function AiTab() {
  const qc = useQueryClient()
  const { data, refetch } = useQuery({ queryKey: ['ai-providers'], queryFn: async () => (await fetch('/api/ai-providers').then((r) => r.json())).data })
  const [form, setForm] = useState({ provider: 'deepseek', baseUrl: getProviderDefaults('deepseek').baseUrl, apiKey: '', model: getProviderDefaults('deepseek').models[0], name: '' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; latency?: number; error?: string } | null>(null)

  const save = async () => {
    try {
      const res = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('已保存，API Key 已 AES-256-GCM 加密存储')
        refetch()
        setForm({ ...form, apiKey: '' })
      } else toast.error(json.error || '保存失败')
    } catch (e) {
      toast.error('保存失败：' + (e as Error).message)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      setTestResult(json.data)
      if (!json.ok) toast.error(json.error || '测试失败')
    } catch (e) {
      setTestResult({ ok: false, error: (e as Error).message })
      toast.error('测试失败：' + (e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  const setActive = async (id: string, isActive: boolean) => {
    await fetch('/api/ai-providers', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, isActive }) })
    refetch()
    toast.success(isActive ? '已设为当前使用的模型' : '已停用')
  }

  const remove = async (id: string) => {
    await fetch('/api/ai-providers', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
    refetch()
  }

  const defaults = getProviderDefaults(form.provider as any)
  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-primary" />自带 AI 接口（9 种服务商，OpenAI 兼容 / Anthropic / Gemini 统一网关）</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs">服务商</Label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v, baseUrl: getProviderDefaults(v as any).baseUrl })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['openai', 'deepseek', 'qwen', 'glm', 'moonshot', 'anthropic', 'gemini', 'ollama', 'custom'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">模型</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={defaults.models[0] ?? 'model-name'} />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Base URL</Label>
            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder={defaults.baseUrl} />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">API Key（AES-256-GCM 加密存储，前端只显示掩码）</Label>
            <div className="relative">
              <Input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowKey((s) => !s)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={test} disabled={testing || !form.apiKey}><Zap className="h-4 w-4" />{testing ? '测试中...' : '测试连接'}</Button>
          <Button onClick={save} disabled={!form.apiKey || !form.model}><Save className="h-4 w-4" />保存</Button>
        </div>
        {testResult && (
          <div className={`mt-3 flex items-center gap-2 rounded-lg p-2 text-sm ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {testResult.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {testResult.ok ? `连接成功，延迟 ${testResult.latency}ms` : `连接失败：${testResult.error}`}
            {!testResult.ok && <span className="text-xs text-muted-foreground">失败时将自动切换到系统默认模型</span>}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="mb-3 font-semibold">已配置的接口</h3>
        <div className="space-y-2">
          {(data?.list ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg surface p-3 text-sm">
              <div>
                <span className="font-medium">{p.provider}</span>
                <span className="ml-2 text-muted-foreground">{p.model}</span>
                <span className="ml-2 text-xs text-muted-foreground">Key: {p.apiKeyMasked}</span>
                {p.isActive && <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">使用中</span>}
              </div>
              <div className="flex gap-1">
                {!p.isActive && <Button variant="ghost" size="sm" onClick={() => setActive(p.id, true)}>启用</Button>}
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {(data?.list ?? []).length === 0 && <p className="text-sm text-muted-foreground">还没有配置，使用系统默认模型。配置后你的对话将走你自己的 API。</p>}
        </div>
      </GlassCard>
    </div>
  )
}

function PrivacyTab() {
  return (
    <GlassCard className="space-y-4 p-6">
      <div>
        <h3 className="mb-2 font-semibold">隐私保护</h3>
        <p className="text-sm text-muted-foreground">所有 API Key 使用 AES-256-GCM 加密存储，前端与日志中只显示掩码（前6位+后4位）。</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>隐私模式</Label>
          <p className="text-xs text-muted-foreground">开启后 AI 辅助不自动读取对话，需你主动触发</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>数据收集</Label>
          <p className="text-xs text-muted-foreground">匿名使用统计，用于改进产品</p>
        </div>
        <Switch />
      </div>
      <div>
        <Label className="mb-2 block">数据管理</Label>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass">导出我的数据</Button>
          <Button variant="glass">清空记忆库</Button>
          <Button variant="destructive">删除账号与全部数据</Button>
        </div>
      </div>
    </GlassCard>
  )
}

function NotificationsTab() {
  return (
    <GlassCard className="space-y-4 p-6">
      {[
        { label: '新消息通知', d: '好友和群聊新消息' },
        { label: 'AI 关怀提醒', d: '情绪低落时主动关心' },
        { label: '每日回顾', d: '晚上推送今日情绪摘要' },
      ].map((n, i) => (
        <div key={n.label} className="flex items-center justify-between">
          <div>
            <Label>{n.label}</Label>
            <p className="text-xs text-muted-foreground">{n.d}</p>
          </div>
          <Switch defaultChecked={i < 2} />
        </div>
      ))}
    </GlassCard>
  )
}

function AccountTab() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await fetch('/api/auth/me').then((r) => r.json())).data })
  return (
    <GlassCard className="space-y-4 p-6">
      <div>
        <Label className="mb-1 block text-xs">用户名</Label>
        <Input defaultValue={me?.username} disabled />
      </div>
      <div>
        <Label className="mb-1 block text-xs">邮箱</Label>
        <Input defaultValue={me?.email} disabled />
      </div>
      <Button variant="destructive">退出登录</Button>
    </GlassCard>
  )
}
