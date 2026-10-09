'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { EmotionIndicator } from '@/components/emotion-indicator'
import { useEmotionStore, EMOTION_THEMES } from '@/stores/emotion'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useMusicStore } from '@/stores/music'
import { greeting, relativeTime, emotionMeta } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import {
  Sparkles, Music, Brain, Palette, PenLine, ImageIcon, BookOpen, Play, Quote, Heart, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const username = useAuthStore((s) => s.username)
  const emotion = useEmotionStore((s) => s.current)
  const setEmotion = useEmotionStore((s) => s.setEmotion)
  const applyEmotion = useWallpaperStore((s) => s.applyEmotion)
  const setPlaylist = useMusicStore((s) => s.setPlaylist)
  const setRecommendReason = useMusicStore((s) => s.setRecommendReason)

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: async () => (await fetch('/api/profiles').then((r) => r.json())).data })
  const { data: memories } = useQuery({ queryKey: ['recent-memories'], queryFn: async () => (await fetch('/api/memories?limit=5').then((r) => r.json())).data })

  useEffect(() => {
    applyEmotion(emotion.label)
  }, [emotion.label, applyEmotion])

  // 随机打乱
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const fallbackPlaylist = [
    { id: '1', name: '晴天', artist: '周杰伦' },
    { id: '2', name: '起风了', artist: '买辣椒也用券' },
    { id: '3', name: '夜的钢琴曲五', artist: '石进' },
    { id: '4', name: '城南花已开', artist: '三亩地' },
    { id: '5', name: 'Lemon', artist: '米津玄師' },
  ]

  const playList = async (kind: 'daily' | 'mood' | 'focus') => {
    const urls = {
      daily: '/api/music/daily',
      mood: `/api/music/recommend?mood=${emotion.label}`,
      focus: '/api/music/search?keyword=纯音乐 专注&limit=20',
    }
    try {
      const res = await fetch(urls[kind])
      const json = await res.json()
      const tracks: { id: string; name: string; artist: string }[] = json?.data?.tracks ?? json?.data ?? []
      const list = tracks.length ? shuffle(tracks) : shuffle(fallbackPlaylist)
      setPlaylist(list, 0)
      setRecommendReason('')
      toast.success(kind === 'daily' ? '已播放每日推荐（随机顺序）' : kind === 'focus' ? '已播放专注歌单（随机顺序）' : '已播放情绪歌单（随机顺序）')
    } catch {
      setPlaylist(shuffle(fallbackPlaylist), 0)
    }
  }

  const setMood = (label: typeof emotion.label, intensity: number) => {
    setEmotion({ label, intensity, confidence: 0.85 })
    toast.success(`情绪已切换为${emotionMeta(label).text}，界面正在自适应`)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6">
      {/* 问候卡片 */}
      <motion.div variants={item}>
        <GlassCard className="relative overflow-hidden p-6 sm:p-8" glow>
          <div className="absolute left-1/2 top-0 h-20 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative">
            <p className="text-sm text-muted-foreground">{mounted ? greeting() : '你好'}，</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {profile?.displayName || username || '朋友'} <Sparkles className="ml-1 inline h-6 w-6 text-primary" />
            </h1>
            <p className="mt-2 max-w-xl text-foreground/70">
              {emotion.label !== 'neutral' && emotion.intensity > 40
                ? `我注意到你现在感觉${emotionMeta(emotion.label).text}，我在这里陪着你。想说点什么，或者让我为你放首歌？`
                : '今天过得怎么样？随时和我聊聊，我会记住关于你的一切。'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(['happy', 'sad', 'anxious', 'calm', 'excited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m, 70)}
                  className="rounded-full surface px-3 py-1 text-sm transition-all hover:scale-105 surface-hover"
                >
                  {emotionMeta(m).emoji} {emotionMeta(m).text}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* 情绪仪表盘 三列 */}
      <div className="grid gap-5 md:grid-cols-3">
        <motion.div variants={item}>
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" /> 当前情绪
            </div>
            <EmotionIndicator label={emotion.label} intensity={emotion.intensity} confidence={emotion.confidence} size="lg" />
            <p className="mt-3 text-xs text-muted-foreground">
              情绪自适应已{useEmotionStore.getState().adaptiveEnabled ? '开启' : '关闭'}，壁纸、音乐、配色随情绪平滑过渡
            </p>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Music className="h-4 w-4 text-primary" /> 为你推荐
            </div>
            <p className="text-sm">「{EMOTION_THEMES[emotion.label].music}」歌单</p>
            <p className="mt-1 text-xs text-muted-foreground">
              理由：当前{emotionMeta(emotion.label).text}情绪，{EMOTION_THEMES[emotion.label].music}最匹配
            </p>
            <Button className="mt-3 w-full" variant="glass" onClick={() => playList('mood')}>
              <Play className="h-4 w-4" /> 播放 AI 推荐歌单
            </Button>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> 今日回顾
            </div>
            <p className="text-sm">情绪变化摘要</p>
            <p className="mt-1 text-xs text-muted-foreground">
              共记录 {emotion.label} 为主，建议保持当前节奏，适时放松
            </p>
            <Link href="/growth">
              <Button variant="ghost" size="sm" className="mt-3 w-full">
                查看成长报告 →
              </Button>
            </Link>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 推荐歌单 */}
        <motion.div variants={item} className="lg:col-span-2">
          <GlassCard className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">推荐歌单</h3>
              <Link href="/settings?tab=music" className="text-xs text-primary">音乐设置</Link>
            </div>
            <div className="grid flex-1 content-stretch gap-3 sm:grid-cols-3">
              {[
                { name: '每日推荐', desc: '根据你的口味', icon: Music, kind: 'daily' as const },
                { name: '情绪歌单', desc: `${emotionMeta(emotion.label).text}专属`, icon: Heart, kind: 'mood' as const },
                { name: '专注歌单', desc: '进入心流', icon: BookOpen, kind: 'focus' as const },
              ].map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => playList(p.kind)}
                  className="group flex h-full flex-col rounded-xl surface p-4 text-left transition-all surface-hover"
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/40 to-blue-500/40">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* 最近记忆 */}
        <motion.div variants={item}>
          <GlassCard className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">最近记忆</h3>
              <Link href="/memory" className="text-xs text-primary">全部 →</Link>
            </div>
            <div className="space-y-2">
              {(memories ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">还没有记忆，多和 AI 聊聊吧</p>
              ) : (
                memories.map((m: { id: string; content: string; createdAt: string; emotion?: string | null }) => (
                  <div key={m.id} className="flex gap-2 rounded-lg surface p-2.5 text-xs">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                    <div className="min-w-0">
                      <p className="line-clamp-2">{m.content}</p>
                      <p className="mt-1 text-muted-foreground">{relativeTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* 创作入口 */}
      <motion.div variants={item}>
        <GlassCard className="p-5">
          <h3 className="mb-3 font-semibold">创作入口</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: '写诗', icon: PenLine, color: 'from-pink-500 to-rose-500' },
              { name: '画画', icon: ImageIcon, color: 'from-amber-500 to-orange-500' },
              { name: '故事', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
              { name: '音乐', icon: Music, color: 'from-purple-500 to-indigo-500' },
            ].map((c) => (
              <Link key={c.name} href="/create">
                <div className="group rounded-xl surface p-4 text-center transition-all hover:-translate-y-0.5 surface-hover">
                  <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <c.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-medium">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
