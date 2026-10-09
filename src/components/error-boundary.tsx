'use client'
import { Component, type ReactNode } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; msg?: string }> {
  state = { hasError: false, msg: '' }
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, msg: e.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <p className="font-semibold">出错了</p>
          <p className="mt-1 text-xs text-muted-foreground">{this.state.msg || '页面渲染异常'}</p>
          <button className="mt-3 text-sm text-primary" onClick={() => location.reload()}>刷新重试</button>
        </GlassCard>
      )
    }
    return this.props.children
  }
}
