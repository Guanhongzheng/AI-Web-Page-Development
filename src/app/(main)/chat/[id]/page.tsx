'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Virtuoso } from 'react-virtuoso'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageBubble } from '@/components/message-bubble'
import { AgentTimeline } from '@/components/agent-timeline'
import { MemoryPanel } from '@/components/memory-panel'
import { EmotionIndicator } from '@/components/emotion-indicator'
import { useSocket } from '@/hooks/use-socket'
import { useAuthStore } from '@/stores/auth'
import { useEmotionStore } from '@/stores/emotion'
import { useWallpaperStore } from '@/stores/wallpaper'
import {
  Send, Bot, BotOff, Sparkles, FileText, Languages, Lightbulb, Wand2, Heart, Music, AtSign, Loader2, MessageCircle, Users,
} from 'lucide-react'
import type { ChatMessage, AgentNodeState, MemoryItem, EmotionState } from '@/lib/types'
import { toast } from 'sonner'

export default function ChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const convId = (params?.id ?? '') as string
  const me = useAuthStore((s) => s.userId)
  const username = useAuthStore((s) => s.username)
  const setEmotion = useEmotionStore((s) => s.setEmotion)
  const applyEmotion = useWallpaperStore((s) => s.applyEmotion)
  const { connected, emit, on } = useSocket()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [nodes, setNodes] = useState<AgentNodeState[]>([])
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [showAssist, setShowAssist] = useState(false)
  const [assistResult, setAssistResult] = useState<string | null>(null)
  const [assistLoading, setAssistLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const virtuosoRef = useRef<{ scrollToIndex: (i: number) => void }>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: conv, refetch: refetchConv } = useQuery({
    queryKey: ['conv', convId],
    queryFn: async () => {
      const list = (await fetch('/api/conversations').then((r) => r.json())).data as any[]
      return list.find((c) => c.id === convId)
    },
  })

  const aiInGroup = !!conv?.members?.some((m: any) => m.userId === 'ai-companion')
  const toggleAi = async (add: boolean) => {
    try {
      await fetch(`/api/conversations/${convId}/ai`, { method: add ? 'POST' : 'DELETE' })
      await refetchConv()
      toast.success(add ? '已将 AI 加入群聊（可被 @ 唤醒）' : '已将 AI 移出群聊')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', convId],
    queryFn: async () => {
      const json = await fetch(`/api/conversations/${convId}/messages`).then((r) => r.json())
      return (json.data ?? []) as ChatMessage[]
    },
    enabled: !!convId,
  })

  // 实时消息
  useEffect(() => {
    if (!convId || !connected) return
    emit('join-conversation', convId)
    const off1 = on('new-message', (msg: any) => {
      if (msg.conversationId === convId) refetch()
    })
    const off2 = on('typing', ({ userId, isTyping }: any) => {
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(userId) ? prev : [...prev, userId]
        return prev.filter((u) => u !== userId)
      })
    })
    return () => { off1?.(); off2?.() }
  }, [convId, connected, emit, on, refetch])

  const displayMessages: ChatMessage[] = [
    ...messages.map((m) => ({ ...m, isMe: m.senderId === me, isAi: m.senderId === 'ai-companion' })),
    ...(streamingText
      ? [{ id: 'streaming', conversationId: convId, senderId: 'ai-companion', content: streamingText, type: 'text' as const, createdAt: new Date().toISOString(), isAi: true }]
      : []),
  ]

  useEffect(() => {
    if (displayMessages.length) setTimeout(() => virtuosoRef.current?.scrollToIndex(displayMessages.length - 1), 50)
  }, [displayMessages.length])

  const parseSse = useCallback((reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder()
    let buffer = ''
    const read = async (): Promise<void> => {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(line.slice(6))
          if (evt.type === 'token') { setStreamingText((t) => t + evt.data); streamingTextLocal.current += evt.data }
          else if (evt.type === 'node') setNodes((n) => [...n.filter((x) => x.name !== evt.node.name), evt.node])
          else if (evt.type === 'memories') setMemories(evt.data)
          else if (evt.type === 'emotion') {
            const e = evt.data as EmotionState
            setEmotion(e)
            applyEmotion(e.label)
          }
          else if (evt.type === 'info') toast(evt.data)
          else if (evt.type === 'error') toast.error(evt.data)
        } catch {}
      }
      return read()
    }
    return read()
  }, [applyEmotion, setEmotion])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setStreamingText('')
    streamingTextLocal.current = ''
    setNodes([])
    setMemories([])
    setSending(true)
    try {
      const isAiConv = conv?.type === 'ai'
      const isGroupMention = conv?.type === 'group' && aiInGroup && /@AI|@PersonaMate|@AI助手/.test(text)

      // 1. 保存用户消息
      const saveRes = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const saved = await saveRes.json()
      if (!saved.ok) throw new Error(saved.error)
      emit('new-message', saved.data)
      await refetch()

      // 2. AI 会话或群聊 @ 时触发流式
      if (isAiConv || isGroupMention) {
        const history = messages.slice(-10).map((m) => ({ role: m.isAi ? 'assistant' : 'user', content: m.content }))
        const res = await fetch(`/api/conversations/${convId}/stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: text, history }),
        })
        if (!res.body) throw new Error('无响应流')
        await parseSse(res.body.getReader())

        // 3. 保存 AI 回复
        if (streamingTextLocal.current.trim()) {
          const aiSave = await fetch(`/api/conversations/${convId}/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: streamingTextLocal.current, isAigc: true }),
          })
          const aiMsg = await aiSave.json()
          if (aiMsg.ok) emit('new-message', aiMsg.data)
        }
        setStreamingText('')
        await refetch()
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  // 用 ref 拿最新 streamingText
  const streamingTextLocal = useRef('')
  useEffect(() => { streamingTextLocal.current = streamingText }, [streamingText])

  const runAssist = async (task: string) => {
    if (!input.trim()) return toast('请先输入或选择要处理的内容')
    setAssistLoading(true)
    setAssistResult(null)
    try {
      const res = await fetch(`/api/ai/${task}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: input }),
      })
      const json = await res.json()
      if (json.ok) {
        if (task === 'suggest-reply') {
          setAssistResult(json.data.map((s: any) => `【${s.style}】${s.text}`).join('\n\n'))
        } else if (task === 'emotion') {
          setAssistResult(`情绪：${json.data.label}，强度 ${json.data.intensity}，置信度 ${(json.data.confidence * 100).toFixed(0)}%`)
        } else {
          setAssistResult(json.data)
        }
      }
    } finally {
      setAssistLoading(false)
    }
  }

  if (!conv) return <div className="p-10 text-center text-sm text-muted-foreground">加载中...</div>

  const isAiConv = conv.type === 'ai'
  const isGroup = conv.type === 'group'

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[1fr_300px]">
      <GlassCard className="flex flex-col overflow-hidden p-0">
        {/* 头部 */}
        <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3">
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-purple-500/40 to-blue-500/40">
              {isAiConv ? <Bot className="h-4 w-4" /> : isGroup ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold">{conv.name ?? (isAiConv ? 'PersonaMate AI' : '对话')}</p>
            <p className="text-xs text-muted-foreground">
              {isAiConv ? '全量 Agent 能力 · 长期记忆' : isGroup ? '混合群聊 · AI 可被 @ 唤醒' : '用户单聊 · AI 辅助工具栏'}
              {connected && <span className="ml-2 text-green-400">● 实时连接</span>}
            </p>
          </div>
          {isGroup && (
            aiInGroup ? (
              <Button variant="ghost" size="sm" onClick={() => toggleAi(false)} title="将 AI 移出群聊">
                <BotOff className="mr-1 h-3.5 w-3.5" /> 移除 AI
              </Button>
            ) : (
              <Button variant="glass" size="sm" onClick={() => toggleAi(true)} title="将 AI 加入群聊">
                <Bot className="mr-1 h-3.5 w-3.5" /> 添加 AI
              </Button>
            )
          )}
        </div>

        {/* 消息列表 虚拟滚动 */}
        <div className="flex-1 overflow-hidden px-4 py-3">
          {displayMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="mb-2 h-8 w-8 text-primary/60" />
              <p className="text-sm">开始你们的对话吧</p>
              <p className="mt-1 text-xs">试试说「今天有点累」，看情绪自适应如何生效</p>
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef as any}
              data={displayMessages}
              itemContent={(_, msg) => (
                <div className="py-1.5">
                  <MessageBubble msg={msg} streaming={msg.id === 'streaming'} />
                </div>
              )}
              followOutput="smooth"
            />
          )}
          <div ref={bottomRef} />
          {typingUsers.length > 0 && (
            <p className="py-1 text-xs text-muted-foreground">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              对方正在输入...
            </p>
          )}
        </div>

        {/* AI 辅助工具栏 */}
        <AnimatePresence>
          {showAssist && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-black/10 dark:border-white/10">
              <div className="flex flex-wrap gap-1.5 px-4 py-2">
                {[
                  { task: 'summarize', icon: FileText, label: '总结' },
                  { task: 'translate', icon: Languages, label: '翻译' },
                  { task: 'suggest-reply', icon: Lightbulb, label: '建议回复' },
                  { task: 'polish', icon: Wand2, label: '润色' },
                  { task: 'emotion', icon: Heart, label: '情绪分析' },
                  { task: 'recommend-bgm', icon: Music, label: '推荐BGM' },
                ].map((t) => (
                  <Button key={t.task} variant="glass" size="sm" disabled={assistLoading} onClick={() => runAssist(t.task)}>
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </Button>
                ))}
              </div>
              {assistLoading && <p className="px-4 pb-2 text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />AI 处理中...</p>}
              {assistResult && (
                <div className="mx-4 mb-2 rounded-lg bg-primary/10 p-3 text-xs whitespace-pre-wrap">{assistResult}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 输入框 */}
        <div className="border-t border-black/10 dark:border-white/10 p-3">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowAssist((s) => !s)} title="AI 辅助工具">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={isAiConv ? '和 PersonaMate 聊聊...' : isGroup ? '输入消息，@AI 唤醒助手' : '输入消息...'}
              className="flex-1 resize-none"
              onInput={(e) => emit('typing', { convId, isTyping: (e.target as HTMLInputElement).value.length > 0 })}
            />
            {isGroup && (
              <Button variant="ghost" size="icon" onClick={() => setInput((v) => v + '@AI ')} title="@AI">
                <AtSign className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={send} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* 右侧信息面板 */}
      <div className="hidden flex-col gap-3 lg:flex">
        {(nodes.length > 0 || memories.length > 0) && (
          <GlassCard className="p-4">
            {nodes.length > 0 && <AgentTimeline nodes={nodes} />}
            {memories.length > 0 && <div className="mt-3"><MemoryPanel memories={memories} /></div>}
          </GlassCard>
        )}
        <GlassCard className="p-4">
          <h3 className="mb-2 text-sm font-semibold">会话能力</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>✓ 流式 SSE 输出</li>
            <li>✓ Agent 思考链可视化</li>
            <li>✓ RAG 记忆检索与引用</li>
            {isAiConv && <li>✓ 情绪自适应界面</li>}
            {isGroup && <li>✓ @AI 唤醒 / 自动总结</li>}
            {!isAiConv && <li>✓ 总结/翻译/建议/润色</li>}
            <li>✓ 实时在线 / 输入中 / 已读</li>
          </ul>
        </GlassCard>
        <EmotionCard />
        <GlassCard className="p-4">
          <h3 className="mb-2 text-sm font-semibold">RAG 效果对比</h3>
          <p className="text-xs text-muted-foreground">
            开启 RAG 后，回复会引用你的历史记忆（如「根据你 3 天前提到的…」），更个性化、更连贯。
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

function EmotionCard() {
  const e = useEmotionStore((s) => s.current)
  return (
    <GlassCard className="p-4">
      <h3 className="mb-2 text-sm font-semibold">当前情绪</h3>
      <EmotionIndicator label={e.label} intensity={e.intensity} confidence={e.confidence} />
    </GlassCard>
  )
}
