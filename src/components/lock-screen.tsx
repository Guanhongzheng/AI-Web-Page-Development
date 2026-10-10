'use client'
import { useEffect, useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { useEmotionStore } from '@/stores/emotion'
import { emotionMeta } from '@/lib/utils'

function greeting(h: number) {
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

// 网站介绍首屏：占据整个视口，随网页滚动露出下方主应用
export function IntroHero() {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(new Date())
  const emotion = useEmotionStore((s) => s.current)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const time = mounted
    ? now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--'
  const date = mounted
    ? now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
    : '加载中…'

  const meta = emotionMeta(emotion.label)
  const hint = emotion.label !== 'neutral' && emotion.intensity > 40
    ? `检测到你现在感觉${meta.text}，我在这里陪着你`
    : '你的专属 AI 伴侣，记住关于你的一切'

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-between overflow-hidden">
      {/* 模糊遮罩 + 渐变氛围，背后透出壁纸 */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      <div className="relative z-10 flex w-full items-center justify-between px-8 pt-8 text-xs text-foreground/70">
        <span>{time}</span>
        <span className="tracking-widest">PERSONAMATE</span>
      </div>

      <div className="relative z-10 -mt-16 flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-primary/30">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <p className="text-sm font-medium tracking-wide text-foreground/70">
          {mounted ? greeting(now.getHours()) : '你好'}
        </p>
        <h1 className="mt-1 bg-gradient-to-br from-white to-white/60 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
          {time}
        </h1>
        <p className="mt-3 text-base text-foreground/80">{date}</p>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-foreground/60">{hint}</p>
      </div>

      <div className="relative z-10 mb-12 flex flex-col items-center gap-3">
        <div className="text-sm font-medium tracking-widest text-foreground/70">向下滚动开始体验</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/30 bg-foreground/10 backdrop-blur">
          <ChevronDown className="h-5 w-5 animate-bounce text-foreground/80" />
        </div>
      </div>
    </section>
  )
}
