'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PenLine, BookOpen, Music, ImageIcon, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CreatePage() {
  const [type, setType] = useState('poem')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: list, refetch } = useQuery({ queryKey: ['creations'], queryFn: async () => (await fetch('/api/creations').then((r) => r.json())).data })

  const generate = async () => {
    if (!prompt.trim()) return toast('请输入创作主题')
    setLoading(true)
    try {
      const res = await fetch('/api/creations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, prompt }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('创作完成')
        setPrompt('')
        refetch()
      }
    } finally {
      setLoading(false)
    }
  }

  const TYPES = [
    { v: 'poem', l: '写诗', icon: PenLine },
    { v: 'story', l: '故事', icon: BookOpen },
    { v: 'song', l: '歌词', icon: Music },
    { v: 'note', l: '短文', icon: Wand2 },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-[calc(100vh-260px)] gap-4 overflow-hidden">
      <GlassCard className="w-full shrink-0 p-6 lg:w-1/2">
        <h2 className="mb-4 text-xl font-bold"><Sparkles className="mr-1 inline h-5 w-5 text-primary" />创作空间</h2>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {TYPES.map((t) => (
            <button key={t.v} onClick={() => setType(t.v)} className={`rounded-xl p-3 text-center transition-all ${type === t.v ? 'bg-primary text-primary-foreground' : 'surface surface-hover'}`}>
              <t.icon className="mx-auto mb-1 h-5 w-5" />
              <p className="text-xs">{t.l}</p>
            </button>
          ))}
        </div>
        <Label className="mb-1 block text-sm">创作主题 / 情绪</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="比如：写一首关于雨夜思念的诗，带点伤感..." className="min-h-[88px] max-h-[180px] resize-none" />
        <Button className="mt-3 w-full" disabled={loading || !prompt.trim()} onClick={generate}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? '生成中...' : '开始创作'}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">作品会自动存入记忆库，影响未来个性化回复</p>
      </GlassCard>

      <GlassCard className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
        <h3 className="mb-3 shrink-0 px-1 font-semibold">我的作品</h3>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {(list ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">{c.type}</span>
                <span>{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
            </div>
          ))}
          {(list ?? []).length === 0 && <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">还没有作品，开始你的第一次创作吧</div>}
        </div>
      </GlassCard>
    </motion.div>
  )
}
