'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown, Quote } from 'lucide-react'
import { relativeTime } from '@/lib/utils'
import type { MemoryItem } from '@/lib/types'
import { emotionMeta } from '@/lib/utils'

export function MemoryPanel({ memories, title = '引用记忆' }: { memories: MemoryItem[]; title?: string }) {
  const [open, setOpen] = useState(true)
  if (memories.length === 0) return null
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-xs font-medium text-primary">
        <Brain className="h-3.5 w-3.5" />
        {title}（{memories.length}）
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-1.5">
              {memories.map((m) => (
                <div key={m.id} className="flex gap-2 text-xs">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-foreground/80">{m.content}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                      {m.source && <span>· {m.source}</span>}
                      {m.emotion && (
                        <span style={{ color: emotionMeta(m.emotion).color }}>
                          {emotionMeta(m.emotion).emoji} {emotionMeta(m.emotion).text}
                        </span>
                      )}
                      <span>{relativeTime(m.createdAt)}</span>
                      {m.score !== undefined && <span>相关度 {(m.score * 100).toFixed(0)}%</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
