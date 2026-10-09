'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { Sparkles, UserPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const schema = z.object({
  username: z.string().min(2, '用户名至少 2 位'),
  email: z.string().email('邮箱格式错误'),
  password: z.string().min(6, '密码至少 6 位'),
})

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setAuth({ userId: json.data.id, username: json.data.username })
      toast.success('注册成功，开始个性化引导')
      router.push('/onboarding')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
      <GlassCard className="p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">创建账号</h1>
          <p className="mt-1 text-sm text-white/60">让 PersonaMate 认识你</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-white/80">用户名</Label>
            <Input {...register('username')} placeholder="给自己起个名字" className="mt-1 surface text-white placeholder-white/40" />
            {errors.username && <p className="mt-1 text-xs text-red-300">{errors.username.message as string}</p>}
          </div>
          <div>
            <Label className="text-white/80">邮箱</Label>
            <Input {...register('email')} type="email" placeholder="you@example.com" className="mt-1 surface text-white placeholder-white/40" />
            {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message as string}</p>}
          </div>
          <div>
            <Label className="text-white/80">密码</Label>
            <Input {...register('password')} type="password" placeholder="至少 6 位" className="mt-1 surface text-white placeholder-white/40" />
            {errors.password && <p className="mt-1 text-xs text-red-300">{errors.password.message as string}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            <UserPlus className="h-4 w-4" />
            {loading ? '注册中...' : '注册并开始'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/60">
          已有账号？
          <Link href="/login" className="ml-1 font-medium text-purple-300 hover:underline">
            登录
          </Link>
        </p>
      </GlassCard>
    </motion.div>
  )
}
