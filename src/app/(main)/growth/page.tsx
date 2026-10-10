'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { TrendingUp, Brain, Palette, Heart, Activity } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { emotionMeta, relativeTime } from '@/lib/utils'

export default function GrowthPage() {
  const { data } = useQuery({ queryKey: ['growth'], queryFn: async () => (await fetch('/api/growth?days=30').then((r) => r.json())).data })
  const series = data?.series ?? []
  const stats = data?.stats ?? {}
  const top = stats.topEmotion ? emotionMeta(stats.topEmotion) : null

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-[calc(100vh-260px)] flex-col gap-4 overflow-hidden">
      <h1 className="shrink-0 text-2xl font-bold">成长报告</h1>

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Activity, label: '情绪记录', value: stats.emotionsCount ?? 0, color: 'text-purple-400' },
          { icon: Brain, label: '记忆沉淀', value: stats.memories ?? 0, color: 'text-blue-400' },
          { icon: Palette, label: '创作作品', value: stats.creations ?? 0, color: 'text-pink-400' },
          { icon: Heart, label: '平均情绪强度', value: stats.avgIntensity ?? 0, color: 'text-rose-400' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <s.icon className={`mb-2 h-5 w-5 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="shrink-0 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">近 30 天情感曲线</h3>
          {top && <span className="text-sm" style={{ color: top.color }}>主导情绪：{top.emoji} {top.text}</span>}
        </div>
        <div className="h-64">
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[-4, 4]} />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={2} fill="url(#emotionGrad)" name="情绪指数" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无足够数据，多和 AI 互动来生成你的情感曲线</div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="flex min-h-0 flex-1 flex-col p-6">
        <h3 className="mb-3 shrink-0 font-semibold">成长点滴</h3>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {(data?.growth ?? []).map((g: any) => (
            <div key={g.id} className="flex gap-3 rounded-lg surface p-3 text-sm">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p>{g.content}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(g.createdAt)}</p>
              </div>
            </div>
          ))}
          {(data?.growth ?? []).length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">还没有成长记录</p>}
        </div>
      </GlassCard>
    </motion.div>
  )
}
