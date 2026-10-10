'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { useEmotionStore, EMOTION_THEMES } from '@/stores/emotion'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useMusicStore } from '@/stores/music'
import { greeting, relativeTime, emotionMeta } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import {
  Sparkles, Music, Brain, Palette, PenLine, ImageIcon, BookOpen, Play, Quote, Heart, TrendingUp, Lightbulb,
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
  const { data: memories, isLoading: memLoading } = useQuery({ queryKey: ['recent-memories'], queryFn: async () => (await fetch('/api/memories?limit=5').then((r) => r.json())).data })
  const { data: emotions } = useQuery({ queryKey: ['home-emotions'], queryFn: async () => (await fetch('/api/emotions?limit=30').then((r) => r.json())).data })

  const isToday = (d: Date) => {
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }
  const todayEmotions = (emotions ?? []).filter((e: any) => isToday(new Date(e.createdAt)))
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]
  const suggestions: Record<string, string[]> = {
    happy: ['把这份好心情记录进日记，让快乐沉淀下来', '适合创作一首诗或画点什么', '可以分享给朋友，传染快乐'],
    sad: ['我在这里陪着你，想聊聊吗？', '听首温柔的钢琴曲，放慢呼吸', '写下此刻的感受，情绪会轻一些'],
    anxious: ['试试 4-7-8 呼吸法：吸气4秒、屏息7秒、呼气8秒', '听一段白噪音，让思绪落地', '把担心的事写下来，逐个拆解'],
    calm: ['状态很稳，适合专注创作或学习', '整理一下今天的记忆与收获', '保持节奏，适度休息'],
    excited: ['热情可贵，把它导向一个创作目标', '注意劳逸结合，别透支精力', '记录灵感，趁热打铁'],
    neutral: ['平平淡淡的一天也值得记录', '可以和 AI 聊聊，碰撞点新想法', '为自己安排一件小确幸'],
    angry: ['先深呼吸 3 次，让身体先平静', '等情绪回落再做决定', '需要的话我随时听你倾诉'],
  }

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

  const playList = async (kind: 'heart' | 'mood' | 'focus') => {
    const urls = {
      heart: '/api/music/search?keyword=华语流行 热歌&limit=20',
      mood: `/api/music/recommend?mood=${emotion.label}`,
      focus: '/api/music/search?keyword=纯音乐 专注&limit=20',
    }
    try {
      const res = await fetch(urls[kind])
      const json = await res.json()
      const tracks: { id: string; name: string; artist: string; url?: string }[] = json?.data?.tracks ?? json?.data ?? []
      const playable = tracks.filter((t) => t.url)
      const list = playable.length ? shuffle(playable) : []
      if (!list.length) {
        toast.error('暂无可播放音源，请检查网易云服务（3003端口）是否运行')
        return
      }
      setPlaylist(list, 0)
      setRecommendReason('')
      toast.success(kind === 'heart' ? '已播放心动歌单（随机顺序）' : kind === 'focus' ? '已播放专注歌单（随机顺序）' : '已播放情绪歌单（随机顺序）')
    } catch {
      toast.error('音乐服务暂不可用')
    }
  }

  const setMood = (label: typeof emotion.label, intensity: number) => {
    setEmotion({ label, intensity, confidence: 0.85 })
    toast.success(`情绪已切换为${emotionMeta(label).text}，界面正在自适应`)
  }

  const mood = emotionMeta(emotion.label)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {/* 问候卡片 */}
      <motion.div variants={item} className="shrink-0">
        <GlassCard className="relative overflow-hidden p-4 sm:p-5" glow>
          <div className="absolute left-1/2 top-0 h-20 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{mounted ? greeting() : '你好'}，</p>
              <h1 className="mt-0.5 text-xl font-bold sm:text-2xl">
                {profile?.displayName || username || '朋友'} <Sparkles className="ml-1 inline h-5 w-5 text-primary" />
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
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
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3">
        <motion.div variants={item} className="min-h-0">
          <GlassCard className="flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4 text-primary" /> 当前情绪
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg"
                style={{ background: `${mood.color}33`, boxShadow: `0 0 24px ${mood.color}66` }}
              >
                {mood.emoji}
              </div>
              <span className="text-base font-semibold" style={{ color: mood.color }}>{mood.text}</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item} className="min-h-0">
          <GlassCard className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Music className="h-4 w-4 text-primary" /> 为你推荐
            </div>
            <div className="flex-1">
              <p className="text-sm">「{EMOTION_THEMES[emotion.label].music}」歌单</p>
              <p className="mt-1 text-xs text-muted-foreground">
                理由：当前{mood.text}情绪，{EMOTION_THEMES[emotion.label].music}最匹配
              </p>
            </div>
            <Button className="mt-3 w-full" variant="glass" onClick={() => playList('mood')}>
              <Play className="h-4 w-4" /> 播放 AI 推荐歌单
            </Button>
          </GlassCard>
        </motion.div>

        <motion.div variants={item} className="min-h-0">
          <GlassCard className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Music className="h-4 w-4 text-primary" /> 推荐歌单</span>
              <Link href="/settings?tab=music" className="text-xs text-primary">设置</Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {[
                { name: '心动歌单', desc: '华语流行热歌', icon: Music, kind: 'heart' as const },
                { name: '情绪歌单', desc: `${mood.text}专属`, icon: Heart, kind: 'mood' as const },
                { name: '专注歌单', desc: '进入心流', icon: BookOpen, kind: 'focus' as const },
              ].map((p) => (
                <button key={p.name} onClick={() => playList(p.kind)} className="flex shrink-0 items-center gap-3 rounded-xl surface p-2.5 text-left surface-hover">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/40 to-blue-500/40"><p.icon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Play className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* 今日回顾 */}
        <motion.div variants={item} className="min-h-0 lg:col-span-2">
          <GlassCard className="flex h-full min-h-0 flex-col p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> 今日回顾</h3>
              <span className="text-xs text-muted-foreground">{mounted ? `${new Date().getMonth() + 1}月${new Date().getDate()}日 周${weekday}` : ''}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl surface p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{todayEmotions.length}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">今日情绪记录</p>
                </div>
                <div className="rounded-xl surface p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{(memories ?? []).length}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">沉淀记忆</p>
                </div>
                <div className="rounded-xl surface p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{mood.emoji}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">主调 {mood.text}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" /> 给你的建议</p>
                <ul className="space-y-1">
                  {(suggestions[emotion.label] ?? suggestions.neutral).map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/80">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              {todayEmotions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {todayEmotions.slice(0, 6).map((e: any, i: number) => (
                    <span key={i} className="rounded-full surface px-2 py-0.5 text-[10px]">{emotionMeta(e.label).emoji} {emotionMeta(e.label).text}</span>
                  ))}
                </div>
              )}
              <Link href="/growth" className="mt-3 block">
                <Button variant="ghost" size="sm" className="w-full">查看完整成长报告 →</Button>
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        {/* 最近记忆 */}
        <motion.div variants={item} className="min-h-0">
          <GlassCard className="flex h-full min-h-0 flex-col p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="font-semibold">最近记忆</h3>
              <Link href="/memory" className="text-xs text-primary">全部 →</Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto pr-1">
              {memLoading ? (
                [0, 1, 2].map((i) => <div key={i} className="h-12 shrink-0 animate-pulse rounded-lg surface" />)
              ) : (memories ?? []).length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-xs text-muted-foreground">还没有记忆，多和 AI 聊聊吧</p>
                </div>
              ) : (
                (memories ?? []).slice(0, 4).map((m: { id: string; content: string; createdAt: string; emotion?: string | null }) => (
                  <div key={m.id} className="flex shrink-0 gap-2 rounded-lg surface p-2.5 text-xs">
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
      <motion.div variants={item} className="shrink-0">
        <GlassCard className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: '写诗', icon: PenLine, color: 'from-pink-500 to-rose-500' },
              { name: '画画', icon: ImageIcon, color: 'from-amber-500 to-orange-500' },
              { name: '故事', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
              { name: '音乐', icon: Music, color: 'from-purple-500 to-indigo-500' },
            ].map((c) => (
              <Link key={c.name} href="/create">
                <div className="group flex flex-col items-center rounded-xl surface p-2.5 text-center transition-all hover:-translate-y-0.5 surface-hover">
                  <div className={`mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${c.color} shadow transition-transform group-hover:scale-110`}>
                    <c.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
