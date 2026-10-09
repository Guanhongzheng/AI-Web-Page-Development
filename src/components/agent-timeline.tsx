'use client'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react'
import type { AgentNodeState } from '@/lib/types'

const NODE_LABELS: Record<string, string> = {
  intent: '意图识别',
  emotion: '情感分析',
  memory: '记忆检索 (RAG)',
  route: '路由决策',
  persona: '个性化回应',
  creative: '创意生成',
  growth: '成长关怀',
  privacy: '隐私检查',
  write_memory: '记忆写入',
}

export function AgentTimeline({ nodes }: { nodes: AgentNodeState[] }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        Agent 思考链
      </div>
      <div className="space-y-1.5">
        {nodes.map((n, i) => {
          const active = n.status === 'running'
          const done = n.status === 'done'
          const error = n.status === 'error'
          return (
            <motion.div
              key={n.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-xs"
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : error ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
              <span className={done ? 'text-muted-foreground' : active ? 'font-medium text-foreground' : 'text-muted-foreground/60'}>
                {NODE_LABELS[n.name] ?? n.name}
              </span>
              {n.duration !== undefined && <span className="text-muted-foreground/60">{n.duration}ms</span>}
              {active && n.detail && <span className="truncate text-muted-foreground">· {n.detail}</span>}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
