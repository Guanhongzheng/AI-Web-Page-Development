'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brain, Search, Plus, Quote, Trash2 } from 'lucide-react'
import { relativeTime, emotionMeta } from '@/lib/utils'
import { MemoryPanel } from '@/components/memory-panel'
import { toast } from 'sonner'

export default function MemoryPage() {
  const [q, setQ] = useState('')
  const [searched, setSearched] = useState(false)
  const { data, refetch } = useQuery({
    queryKey: ['memories', q, searched],
    queryFn: async () => {
      const url = searched && q ? `/api/memories?q=${encodeURIComponent(q)}` : '/api/memories?limit=100'
      return (await fetch(url).then((r) => r.json())).data
    },
  })
  const results = searched && q ? data?.results ?? [] : data ?? []

  const del = async (id: string) => {
    await fetch('/api/memories', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('已删除')
    refetch()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">个人记忆库</h1>
        <span className="text-xs text-muted-foreground">BM25 + 向量混合检索 · RRF 融合 · 重排 Top5</span>
      </div>

      <GlassCard className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearched(true)} placeholder="搜索记忆，比如「上次提到的电影」" className="pl-9" />
          </div>
          <Button onClick={() => setSearched(true)}><Brain className="h-4 w-4" />RAG 检索</Button>
        </div>
        {searched && q && (
          <p className="mt-2 text-xs text-muted-foreground">查询改写：「{q}」→ 检索到 {results.length} 条相关记忆，按相关度排序</p>
        )}
      </GlassCard>

      {searched && q && results.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="mb-2 text-sm font-semibold">RAG 检索结果（可用于增强回复）</h3>
          <MemoryPanel memories={results} title="Top 相关记忆" />
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold">全部记忆（{results.length}）</h3>
        <div className="space-y-2">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">还没有记忆，去和 AI 聊聊吧</p>}
          {results.map((m: any) => (
            <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex gap-2 rounded-xl surface p-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{m.content}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded surface px-1.5">{m.type}</span>
                  {m.emotion && <span style={{ color: emotionMeta(m.emotion).color }}>{emotionMeta(m.emotion).emoji} {emotionMeta(m.emotion).text}</span>}
                  {m.topic && <span>· {m.topic}</span>}
                  {m.score !== undefined && <span>· 相关度 {(m.score * 100).toFixed(0)}%</span>}
                  <span>· {relativeTime(m.createdAt)}</span>
                </p>
              </div>
              <button onClick={() => del(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  )
}
