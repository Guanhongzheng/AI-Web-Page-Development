'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Plus, MessageCircle, Users, Bot, Search, UserPlus, Copy, Check, Trash2 } from 'lucide-react'
import { relativeTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useSocket } from '@/hooks/use-socket'
import type { Conversation } from '@/lib/types'
import { toast } from 'sonner'

export default function ChatListPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.userId)
  const { on } = useSocket()
  const [creating, setCreating] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [friendId, setFriendId] = useState('')
  const [copied, setCopied] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    const off = on('presence', ({ userId, online }: any) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (online) next.add(userId)
        else next.delete(userId)
        return next
      })
    })
    return () => { off?.() }
  }, [on])

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQ.trim()
      if (!q) { setSearchResults([]); return }
      const json = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then((r) => r.json())
      setSearchResults(json.ok ? json.data : [])
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  const { data, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await fetch('/api/conversations').then((r) => r.json())).data as Conversation[],
  })
  const { data: friendsData, refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await fetch('/api/friends').then((r) => r.json())).data,
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

  const sendFriendRequest = async (userId: string) => {
    if (!userId) return
    if (userId === me) return toast('不能添加自己')
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('好友请求已发送，等待对方确认')
        setFriendId('')
        setSearchQ('')
        refetchFriends()
      } else toast.error(json.error || '发送失败')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const addFriend = () => sendFriendRequest(friendId.trim())

  const chatFriend = async (userId: string) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'user', memberIds: [userId] }),
    })
    const json = await res.json()
    if (json.ok) {
      refetch()
      router.push(`/chat/${json.data.id}`)
    } else toast.error(json.error || '发起失败')
  }

  const copyId = () => {
    navigator.clipboard?.writeText(me ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const deleteConv = async (id: string, name?: string) => {
    if (!window.confirm(`确定删除会话「${name ?? '该会话'}」吗？此操作不可恢复。`)) return
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      toast.success('会话已删除')
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const convs = (data ?? []).filter((c) => !keyword || (c.name ?? '').includes(keyword))
  const friends = friendsData?.friends ?? []
  const incoming = friendsData?.incoming ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 会话列表 */}
      <GlassCard className="flex max-h-[calc(100vh-260px)] flex-col p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold">会话列表</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" title="新 AI 对话" disabled={creating} onClick={() => createConv('ai')}><Bot className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" title="新群聊" disabled={creating} onClick={() => createConv('group')}><Users className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" title="发起单聊" disabled={creating} onClick={() => createConv('user')}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索会话" className="h-8 pl-8 text-xs" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {convs.map((c: any) => {
            const Icon = c.type === 'ai' ? Bot : c.type === 'group' ? Users : MessageCircle
            const displayName = c.name ?? (c.type === 'ai' ? 'AI 伴侣' : '会话')
            return (
              <div key={c.id} className="group flex items-center gap-3 rounded-xl p-2.5 surface-hover">
                <Link href={`/chat/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-gradient-to-br from-purple-500/40 to-blue-500/40"><Icon className="h-4 w-4" /></AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      {c.messages?.[0] && <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(c.messages[0].createdAt)}</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.messages?.[0]?.content ?? '开始对话吧'}</p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  title="删除会话"
                  onClick={() => deleteConv(c.id, displayName)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )
          })}
          {convs.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">暂无会话</p>}
        </div>
      </GlassCard>

      {/* 好友面板 */}
      <GlassCard className="flex max-h-[calc(100vh-260px)] flex-col p-3">
        <h2 className="mb-3 px-1 font-semibold">好友</h2>
        <div className="mb-3 rounded-xl surface p-3">
          <p className="mb-1 text-[11px] text-muted-foreground">我的 ID（分享给对方添加）</p>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 truncate rounded bg-black/10 dark:bg-white/10 px-2 py-1 text-[11px]">{me}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyId} title="复制 ID">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <div className="mb-3">
          <p className="mb-1 px-1 text-[11px] text-muted-foreground">添加好友（输入对方 ID）</p>
          <div className="flex gap-1.5">
            <Input value={friendId} onChange={(e) => setFriendId(e.target.value)} placeholder="粘贴用户 ID" className="h-8 text-xs" />
            <Button size="sm" className="h-8" onClick={addFriend}><UserPlus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="mb-3">
          <p className="mb-1 px-1 text-[11px] text-muted-foreground">或按用户名搜索</p>
          <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="输入用户名搜索" className="h-8 text-xs" />
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-lg surface p-1">
              {searchResults.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{u.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <span className="flex-1 truncate">{u.username}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => sendFriendRequest(u.id)}>加好友</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {incoming.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 px-1 text-[11px] text-muted-foreground">好友请求</p>
            {incoming.map((f: any) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg surface px-2 py-1.5 text-xs">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                <span className="flex-1 truncate">{f.username}</span>
                <span className="text-[10px] text-muted-foreground">在通知中确认</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 space-y-1 overflow-y-auto">
          <p className="px-1 text-[11px] text-muted-foreground">我的好友（{friends.length}）</p>
          {friends.map((f: any) => (
            <div key={f.userId} className="flex items-center gap-2 rounded-xl p-2 surface-hover">
              <div className="relative">
                <Avatar className="h-8 w-8"><AvatarFallback>{f.username?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback></Avatar>
                {onlineUsers.has(f.userId) && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />}
              </div>
              <span className="flex-1 truncate text-sm">{f.username}</span>
              <span className="text-[10px] text-muted-foreground">{onlineUsers.has(f.userId) ? '在线' : '离线'}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="发消息" onClick={() => chatFriend(f.userId)}><MessageCircle className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {friends.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">还没有好友，输入对方 ID 添加吧</p>}
        </div>
      </GlassCard>
    </div>
  )
}
