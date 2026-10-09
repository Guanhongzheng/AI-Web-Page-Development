'use client'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatTime, emotionMeta } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { Sparkles, ShieldCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export function MessageBubble({ msg, streaming }: { msg: ChatMessage; streaming?: boolean }) {
  const meta = msg.emotion ? emotionMeta(msg.emotion) : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}
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
        </div>
      </div>
    </motion.div>
  )
}
