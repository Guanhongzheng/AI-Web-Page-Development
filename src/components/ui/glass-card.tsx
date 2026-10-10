'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 1 | 2 | 3 | 4
  glow?: boolean
}

export function GlassCard({ intensity, glow, className, children, ...props }: GlassCardProps) {
  const storeLevel = useUiStore((s) => s.glassLevel)
  const level = intensity ?? storeLevel
  return (
    <div
      className={cn(
        'glass-shine rounded-2xl transition-shadow duration-300',
        level === 1 && 'glass-light',
        level === 2 && 'glass',
        level === 3 && 'glass-strong',
        level === 4 && 'glass-flat',
        glow && 'shadow-[0_0_40px_rgba(168,85,247,0.25)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
