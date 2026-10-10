'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatTime, emotionMeta } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { Sparkles, ShieldCheck, Volume2, VolumeX, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[#*_`~]/g, ''))
  u.lang = 'zh-CN'
  u.rate = 1
  window.speechSynthesis.speak(u)
}

export function MessageBubble({ msg, streaming }: { msg: ChatMessage; streaming?: boolean }) {
  const meta = msg.emotion ? emotionMeta(msg.emotion) : null
  const [speaking, setSpeaking] = useState(false)

  const toggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('当前浏览器不支持语音朗读')
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    speak(msg.content)
    setSpeaking(true)
    window.speechSynthesis.speaking && setTimeout(() => setSpeaking(false), 0)
    // 朗读结束自动复位
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false)
        clearInterval(check)
      }
    }, 500)
  }

  const copy = () => {
    navigator.clipboard?.writeText(msg.content)
    toast.success('已复制消息内容')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onDoubleClick={copy}
      title="双击复制"
      className={`group flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>{msg.isAi ? 'AI' : (msg.senderName?.[0]?.toUpperCase() ?? 'U')}</AvatarFallback>
      </Avatar>
      <div className={`flex max-w-[75%] flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{msg.isAi ? 'PersonaMate' : msg.senderName}</span>
          {msg.isAi && <Sparkles className="h-3 w-3 text-primary" />}
          {meta && <span style={{ color: meta.color }}>{meta.emoji}</span>}
          <span>{formatTime(msg.createdAt)}</span>
        </div>
        <div
          className={`relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            msg.isMe
              ? 'bg-primary text-primary-foreground'
              : msg.isAi
                ? 'ai-message-border text-foreground'
                : 'glass'
          } ${streaming ? 'stream-cursor' : ''}`}
        >
          {msg.isAi ? (
            <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          {msg.isAigc && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] opacity-70" title="AI 生成内容，已加水印与元数据">
              <ShieldCheck className="h-3 w-3" />
              AIGC 标识
            </div>
          )}
          {/* 悬浮操作：AI 消息可朗读，任意消息可复制 */}
          <div className={`absolute -bottom-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${msg.isMe ? 'right-0' : 'left-0'}`}>
            {msg.isAi && (
              <button onClick={toggleSpeak} title={speaking ? '停止朗读' : '语音朗读'} className="glass flex h-6 w-6 items-center justify-center rounded-full text-xs text-muted-foreground hover:text-primary">
                {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
            )}
            <button onClick={copy} title="复制" className="glass flex h-6 w-6 items-center justify-center rounded-full text-xs text-muted-foreground hover:text-primary">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
