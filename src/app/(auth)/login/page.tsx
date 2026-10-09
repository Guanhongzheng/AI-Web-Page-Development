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
import { Sparkles, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const schema = z.object({ account: z.string().min(1, '请输入账号'), password: z.string().min(1, '请输入密码') })

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setAuth({ userId: json.data.id, username: json.data.username, avatar: json.data.avatar })
      toast.success('登录成功')
      router.push('/')
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
          <h1 className="text-2xl font-bold text-white">PersonaMate AI</h1>
          <p className="mt-1 text-sm text-white/60">你的个性化多模态 AI 伴侣</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-white/80">账号</Label>
            <Input {...register('account')} placeholder="用户名或邮箱" className="mt-1 surface text-white placeholder-white/40" />
            {errors.account && <p className="mt-1 text-xs text-red-300">{errors.account.message as string}</p>}
          </div>
          <div>
            <Label className="text-white/80">密码</Label>
            <Input {...register('password')} type="password" placeholder="密码" className="mt-1 surface text-white placeholder-white/40" />
            {errors.password && <p className="mt-1 text-xs text-red-300">{errors.password.message as string}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            <LogIn className="h-4 w-4" />
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/60">
          还没有账号？
          <Link href="/register" className="ml-1 font-medium text-purple-300 hover:underline">
            注册
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-white/40">演示账号：demo / demo123（首次启动请先注册）</p>
      </GlassCard>
    </motion.div>
  )
}
