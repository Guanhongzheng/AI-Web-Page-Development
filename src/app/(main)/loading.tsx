'use client'
import { Loader2, Sparkles } from 'lucide-react'
import { CardSkeleton, Skeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* 骨架屏：先铺出内容占位，避免加载期整页空白 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <div className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载…
      </div>
    </div>
  )
}
