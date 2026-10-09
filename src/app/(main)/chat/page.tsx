'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Plus, MessageCircle, Users, Bot, Search } from 'lucide-react'
import { relativeTime } from '@/lib/utils'
import type { Conversation } from '@/lib/types'
import { toast } from 'sonner'

export default function ChatListPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [keyword, setKeyword] = useState('')
  const { data, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await fetch('/api/conversations').then((r) => r.json())).data as Conversation[],
  })

  const createConv = async (type: 'ai' | 'user' | 'group') => {
    setCreating(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, name: type === 'group' ? '新群聊' : undefined }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('会话已创建')
        refetch()
        router.push(`/chat/${json.data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const convs = (data ?? []).filter((c) =>
    !keyword || (c.name ?? '').includes(keyword),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <GlassCard className="flex max-h-[calc(100vh-180px)] flex-col p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold">会话列表</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" title="新 AI 对话" disabled={creating} onClick={() => createConv('ai')}>
              <Bot className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="新群聊" disabled={creating} onClick={() => createConv('group')}>
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="发起单聊" disabled={creating} onClick={() => createConv('user')}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索会话" className="h-8 pl-8 text-xs" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {convs.map((c: any) => {
            const Icon = c.type === 'ai' ? Bot : c.type === 'group' ? Users : MessageCircle
            return (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <div className="flex items-center gap-3 rounded-xl p-2.5 transition-colors surface-hover">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500/40 to-blue-500/40">
                      <Icon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{c.name ?? (c.type === 'ai' ? 'AI 伴侣' : '会话')}</p>
                      {c.messages?.[0] && <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(c.messages[0].createdAt)}</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.messages?.[0]?.content ?? '开始对话吧'}
                    </p>
                  </div>
                  {c.online && <span className="h-2 w-2 shrink-0 rounded-full bg-green-400" />}
                </div>
              </Link>
            )
          })}
          {convs.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">暂无会话</p>}
        </div>
      </GlassCard>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden items-center justify-center lg:flex">
        <GlassCard className="w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold">统一对话中枢</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 伴侣、好友、群聊在同一个系统里。<br />
            选择左侧会话开始，体验全量 Agent 能力与 AI 辅助。
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
