'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 1 | 2 | 3
  glow?: boolean
}

export function GlassCard({ intensity, glow, className, children, ...props }: GlassCardProps) {
  const level = intensity ?? useUiStore.getState().glassLevel
  return (
    <div
      className={cn(
        'rounded-xl glass-shine transition-colors duration-300',
        level === 1 && 'glass-light',
        level === 2 && 'glass',
        level === 3 && 'glass-strong',
        glow && 'shadow-[0_0_40px_rgba(168,85,247,0.25)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
