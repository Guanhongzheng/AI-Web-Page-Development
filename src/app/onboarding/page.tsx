'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const INTERESTS = ['阅读', '音乐', '电影', '旅行', '编程', '摄影', '美食', '运动', '游戏', '写作', '冥想', '宠物']

export default function OnboardingPage() {
  const router = useRouter()
  const userId = useAuthStore((s) => s.userId)
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [style, setStyle] = useState('friendly')
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const finish = async () => {
    if (!userId) return
    setSaving(true)
    try {
      await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, bio, persona: { interests, style } }),
      })
      toast.success('个性化配置完成')
      router.push('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
        <GlassCard className="p-8">
          <div className="mb-6 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 w-12 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-white/20'}`} />
            ))}
          </div>

          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white">你希望我怎么称呼你？</h2>
              <div>
                <Label className="text-white/80">昵称</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 surface text-white" placeholder="你的昵称" />
              </div>
              <div>
                <Label className="text-white/80">一句话介绍自己</Label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 surface text-white" placeholder="比如：热爱生活的创作者" />
              </div>
              <Button className="w-full" onClick={() => setStep(1)}>下一步</Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white">你对什么感兴趣？</h2>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setInterests((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
                    className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                      interests.includes(t) ? 'bg-primary text-primary-foreground' : 'surface text-white/80 surface-hover'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-white/80" onClick={() => setStep(0)}>上一步</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>下一步</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white">你喜欢什么样的交流风格？</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'friendly', l: '温暖朋友', d: '像好朋友一样自然' },
                  { v: 'professional', l: '专业顾问', d: '条理清晰有深度' },
                  { v: 'playful', l: '俏皮搭子', d: '幽默有趣爱调侃' },
                  { v: 'philosophical', l: '深度思考', d: '一起探讨人生' },
                ].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setStyle(s.v)}
                    className={`rounded-xl p-4 text-left transition-all ${style === s.v ? 'bg-primary text-primary-foreground' : 'surface text-white/80 surface-hover'}`}
                  >
                    <div className="font-medium">{s.l}</div>
                    <div className="text-xs opacity-70">{s.d}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-white/80" onClick={() => setStep(1)}>上一步</Button>
                <Button className="flex-1" disabled={saving} onClick={finish}>
                  {saving ? '保存中...' : '完成，开启旅程'}
                </Button>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
