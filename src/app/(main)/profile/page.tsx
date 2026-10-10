'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth'
import { User, Heart, Brain, Sparkles } from 'lucide-react'

export default function ProfilePage() {
  const username = useAuthStore((s) => s.username)
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: async () => (await fetch('/api/profiles').then((r) => r.json())).data })
  const persona = (profile?.persona ?? {}) as { interests?: string[]; style?: string }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex h-[calc(100vh-260px)] max-w-2xl flex-col gap-4 overflow-hidden">
      <GlassCard className="shrink-0 p-6 text-center">
        <Avatar className="mx-auto mb-3 h-20 w-20">
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-2xl">{username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold">{profile?.displayName || username}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile?.bio || '这个人很懒，什么都没留下'}</p>
      </GlassCard>

      <div className="grid shrink-0 gap-4 sm:grid-cols-2">
        <GlassCard className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" />交流风格</div>
          <p className="text-sm text-muted-foreground">
            {persona.style === 'professional' ? '专业顾问型' : persona.style === 'playful' ? '俏皮搭子型' : persona.style === 'philosophical' ? '深度思考型' : '温暖朋友型'}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary" />兴趣标签</div>
          <div className="flex flex-wrap gap-1.5">
            {(persona.interests ?? []).length === 0 ? (
              <span className="text-sm text-muted-foreground">去 onboarding 补充</span>
            ) : (
              (persona.interests ?? []).map((i) => <span key={i} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">{i}</span>)
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-2 flex shrink-0 items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4 text-primary" />AI 眼中的你</div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            基于你的对话、情绪记录与创作，PersonaMate 持续更新你的动态画像。
            你的记忆会被长期沉淀，让每次回应都更懂你。你可以随时在「隐私」中查看、导出或删除这些数据。
          </p>
        </div>
      </GlassCard>
    </motion.div>
  )
}
