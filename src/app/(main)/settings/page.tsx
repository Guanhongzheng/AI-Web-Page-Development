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
import { useUiStore } from '@/stores/ui'
import { useEmotionStore } from '@/stores/emotion'
import { useWallpaperStore } from '@/stores/wallpaper'
import { getProviderDefaults } from '@/lib/ai-gateway'
import { maskApiKey } from '@/lib/utils'
import {
  Palette, Music, Bot, Shield, Bell, User, Save, Trash2, KeyRound, Zap, Check, X, Loader2, Eye, EyeOff,
  ScrollText, Sparkles, Wrench, Bug, Rocket,
} from 'lucide-react'
import { toast } from 'sonner'

const CHANGELOG = [
  {
    version: 'v1.8.0', date: '2026-10-10', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '新增网站介绍首屏：进入时先展示整屏介绍（实时时钟 / 问候语 / 品牌展示），向下滚动一下即进入主应用',
      '进入主应用后滚动无法回到介绍页，可通过顶栏「回到介绍页」按钮返回；顶栏 / Dock / 播放器仅在主应用区显示',
      '移除专注模式；Dock 栏在介绍页以 500ms 下滑过渡动画隐藏，进入主应用后自动上滑显示并常驻，不再随滚动消失',
      '主页所有卡片收纳进同一屏（无需滚动查看）；主页内容可内部滚动但无法滚回介绍页',
      '「当前情绪」卡片精简为仅显示情绪，去掉置信度、强度与自适应说明文字',
      '新增浏览器记忆（cookie 记录已进入应用）：回访直接进入应用，点击主页不再回到介绍页',
      '隐藏页面级滚动条，仅保留卡片内部细滚动条；卡片横向尽量铺满浏览器',
      '修复点击后导航栏偶发消失，「回到介绍页」按钮全站可用',
      '修复在非主页点「回到介绍页」导致 Dock 消失：改为跳回主页并正确展示介绍页',
      '修复主页卡片滑到底后无法上滑：卡片/内容未到顶时放行上滑，全部到顶才阻止回介绍页',
      '壁纸去除渐显过渡，切换即时完成不再闪一下',
    ],
  },
  {
    version: 'v1.7.0', date: '2026-10-10', tag: '优化', tagColor: 'text-amber-500 bg-amber-500/15',
    items: [
      '统一所有页面尺寸：主内容区固定为视口高度并内部滚动，切换页面时大小不再忽大忽小',
      '壁纸取色升级：提取壁纸主色相，生成同色相不同明度/饱和度的协调配色，卡片层次舒适且颜色不雷同',
      '壁纸切换改为交叉淡入淡出，修复切换情绪、AI 回复时背景闪烁的问题',
      '顶栏上滑自动隐藏、底部 Dock 下滑自动隐藏，鼠标靠近边缘或反向滚动即恢复显示',
      '新增专注模式（顶栏按钮 / Esc 退出），加宽内容区且不隐藏 Dock 导航',
      '创作空间：主题/情绪输入框限制高度不可拖拽放大，「我的作品」加入独立背景卡片并内部滚动',
      'AI 消息支持悬停语音朗读与双击复制，进入网页自动检测网易云连接状态并提示',
    ],
  },
  {
    version: 'v1.6.0', date: '2026-10-10', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '新增壁纸系统：自动读取 public/wallpapers 文件夹，支持 jpg / png / 动态 html，选中即时切换全站背景',
      '新增「配色跟随壁纸」：自动提取壁纸主色生成完整色板，亮色壁纸配深色字、暗色壁纸配浅色字，文字始终清晰',
      '新增背景模糊度调节（0–20px），壁纸虚化程度自由控制',
      '新增顶栏全局搜索：实时检索会话、记忆、用户，分组下拉展示并可一键跳转',
      '新增会话列表删除功能，通知中心卡片美化并适配主题色',
    ],
  },
  {
    version: 'v1.5.1', date: '2026-10-10', tag: '优化', tagColor: 'text-amber-500 bg-amber-500/15',
    items: [
      '界面统一改为「卡片内滚动」：浏览器不滚动，对话/记忆/创作/成长/画像仅内容区滚动，页面铺满视口',
      '玻璃质感升级为真实「液态玻璃 / 毛玻璃 / 亚克力」三档，顶栏与导航栏同步跟随质感',
      '顶栏与导航栏增加连接分隔线，修复导航栏上下重叠与动态壁纸透过玻璃闪烁的问题',
      '简化外观设置：移除主题配色选项，配色完全由壁纸驱动，顶栏主题按钮同步下线',
      '推荐歌单改为可播放的心动歌单，当前情绪 / 为你推荐 / 推荐歌单三卡等高对齐、内容铺满',
      '音乐播放器按钮重构，修复只能播放一首的问题，展开后点击页面任意位置自动收回',
      '优化页面切换速度（popLayout + 缩短过渡），通知与主题弹窗加入弹出动画',
    ],
  },
  {
    version: 'v1.5.0', date: '2026-10-10', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '新增好友系统：每人一个 ID，可复制分享、输入 ID 加好友、好友列表一键发单聊',
      '新增通知中心：顶栏铃铛实时提示好友请求与群邀请，可在通知里接受/拒绝',
      '群聊支持「邀请进群」（输入 ID 发通知，确认后入群）与「添加/移除 AI」',
      '主页布局调整：推荐歌单与今日回顾互换位置，今日回顾内容更丰富（数据统计 + 个性化建议）',
      '修复 AI 消息对齐（稳定显示在左侧），最近记忆卡片固定高度',
      '全站页面切换增加加载动画，关闭动画效果开关现在真正生效',
    ],
  },
  {
    version: 'v1.4.0', date: '2026-10-09', tag: '优化', tagColor: 'text-amber-500 bg-amber-500/15',
    items: [
      '音乐播放器改为圆形悬浮按钮，点击展开/收起控制面板',
      '推荐歌单支持每日推荐、情绪歌单、专注歌单分别播放，歌曲随机顺序',
      '玻璃质感降低不透明度，壁纸通透感更强；主页卡片等高对齐',
      '修复日夜切换文字闪烁（Hydration 失配）与主题图标 SVG 不一致',
    ],
  },
  {
    version: 'v1.3.0', date: '2026-10-08', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '接入 NeteaseCloudMusicApi，音乐搜索 / 每日推荐 / 播放全部走网易云真实数据',
      '用户自带 AI 接口支持 9 种服务商，Base URL 留空自动补默认地址，连接失败自动降级',
      '设置中心新增音乐设置直达，推荐理由与 API Key 掩码展示',
    ],
  },
  {
    version: 'v1.2.0', date: '2026-10-07', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '情绪自适应界面：7 种情绪实时联动主题色、动态壁纸与音乐推荐',
      '动态壁纸引擎：CSS 渐变流光 / Canvas 雨滴粒子 / 音乐响应式网格，2s 平滑过渡',
      '日夜间模式三档切换（亮色 / 暗色 / 跟随系统），transition-colors 不闪屏',
    ],
  },
  {
    version: 'v1.1.0', date: '2026-10-06', tag: '新功能', tagColor: 'text-green-500 bg-green-500/15',
    items: [
      '统一对话中枢：AI 伴侣 / 好友 / 群聊三种会话，右侧能力面板自动切换',
      'Agent 思考链可视化（LangGraph 8 节点）+ RAG 记忆检索引用溯源',
      '群聊 AI 参与：@ 唤醒、自动总结、情绪感知、翻译辅助',
    ],
  },
  {
    version: 'v1.0.0', date: '2026-10-05', tag: '发布', tagColor: 'text-primary bg-primary/15',
    items: [
      'PersonaMate AI 首个完整版本上线',
      '核心模块：个性化对话、个人记忆 RAG、多模态理解、AI 安全与隐私、实时社交',
      '技术栈：Next.js 14 + React 18 + TypeScript + Tailwind + shadcn/ui + LangGraph',
    ],
  },
]

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
          <TabsTrigger value="changelog"><ScrollText className="h-4 w-4" />更新日志</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
        <TabsContent value="music"><MusicTab /></TabsContent>
        <TabsContent value="ai"><AiTab /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="account"><AccountTab /></TabsContent>
        <TabsContent value="changelog"><ChangelogTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}

function AppearanceTab() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const ui = useUiStore()
  const { data: wallpaperList } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: async () => (await fetch('/api/wallpapers').then((r) => r.json())).data ?? [],
  })
  return (
    <GlassCard className="space-y-6 p-6">
      <div>
        <Label className="mb-2 block">质感</Label>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4] as const).map((l) => (
            <Button key={l} variant={ui.glassLevel === l ? 'default' : 'glass'} onClick={() => ui.setGlassLevel(l)}>
              {l === 1 ? '液态玻璃' : l === 2 ? '毛玻璃' : l === 3 ? '亚克力' : '扁平化'}
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

      <div>
        <Label className="mb-2 block">壁纸</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <button
            onClick={() => { ui.setWallpaper(''); toast.success('已恢复默认动态壁纸') }}
            className={`aspect-video overflow-hidden rounded-lg border text-[10px] transition-all ${mounted && ui.wallpaper === '' ? 'border-primary ring-1 ring-primary' : 'border-border hover:opacity-80'}`}
          >
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">默认</div>
          </button>
          {(wallpaperList ?? []).map((w: any) => (
            <button
              key={w.src}
              onClick={() => { ui.setWallpaper(w.src); toast.success(`已切换壁纸：${w.label}`) }}
              className={`relative aspect-video overflow-hidden rounded-lg border transition-all ${mounted && ui.wallpaper === w.src ? 'border-primary ring-1 ring-primary' : 'border-border hover:opacity-80'}`}
              title={w.label}
            >
              {w.html ? (
                <span className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-indigo-900 text-[10px] text-white">▶ {w.label}</span>
              ) : (
                <img src={w.src} alt={w.label} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">壁纸文件位于 public/wallpapers/ 目录，可自行放入图片后在此选择</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="!mb-0">背景模糊度</Label>
          <span className="text-xs text-muted-foreground">{ui.bgBlur}px</span>
        </div>
        <Slider value={[ui.bgBlur]} onValueChange={(v) => ui.setBgBlur(v[0] ?? 0)} max={20} step={1} />
        <p className="mt-1 text-xs text-muted-foreground">数值越大背景越虚化，突出前景内容</p>
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

function ChangelogTab() {
  const tagIcon = (tag: string) => {
    if (tag === '新功能') return <Sparkles className="h-3.5 w-3.5" />
    if (tag === '优化') return <Wrench className="h-3.5 w-3.5" />
    if (tag === '修复') return <Bug className="h-3.5 w-3.5" />
    return <Rocket className="h-3.5 w-3.5" />
  }
  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">更新日志</h3>
        <span className="text-xs text-muted-foreground">PersonaMate AI 版本迭代记录</span>
      </div>
      <div className="relative space-y-6 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
        {CHANGELOG.map((c) => (
          <div key={c.version} className="relative pl-7">
            <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">{c.version}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${c.tagColor}`}>
                {tagIcon(c.tag)}{c.tag}
              </span>
              <span className="text-xs text-muted-foreground">{c.date}</span>
            </div>
            <ul className="mt-2 space-y-1">
              {c.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
