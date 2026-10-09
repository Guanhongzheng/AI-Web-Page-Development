'use client'
import { motion } from 'framer-motion'
import { emotionMeta } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import type { EmotionLabel } from '@/lib/types'

export function EmotionIndicator({
  label,
  intensity,
  confidence,
  size = 'md',
}: {
  label: EmotionLabel
  intensity: number
  confidence?: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = emotionMeta(label)
  const dims = size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'sm' ? 'h-8 w-8 text-lg' : 'h-12 w-12 text-2xl'
  return (
    <div className="flex items-center gap-3">
      <motion.div
        className={`flex ${dims} items-center justify-center rounded-full shadow-lg`}
        style={{ background: `${meta.color}33`, boxShadow: `0 0 20px ${meta.color}66` }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {meta.emoji}
      </motion.div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.text}</span>
          {confidence !== undefined && (
            <span className="text-xs text-muted-foreground">置信度 {(confidence * 100).toFixed(0)}%</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Progress value={intensity} className="h-1.5 w-24" />
          <span className="text-xs text-muted-foreground">强度 {intensity}</span>
        </div>
      </div>
    </div>
  )
}
