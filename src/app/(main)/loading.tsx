'use client'
import { Loader2, Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <div className="glass flex h-16 w-16 items-center justify-center rounded-full">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载…
      </div>
    </div>
  )
}
