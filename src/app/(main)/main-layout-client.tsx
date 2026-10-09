'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { WallpaperEngine } from '@/components/wallpaper-engine'
import { FloatingMusicPlayer } from '@/components/floating-music-player'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Home, MessageCircle, Brain, Palette, TrendingUp, User, Settings, Sun, Moon, Monitor,
  Bell, Search, LogOut, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

const NAV = [
  { href: '/', icon: Home, label: '主页' },
  { href: '/chat', icon: MessageCircle, label: '对话' },
  { href: '/memory', icon: Brain, label: '记忆' },
  { href: '/create', icon: Palette, label: '创作' },
  { href: '/growth', icon: TrendingUp, label: '成长' },
  { href: '/profile', icon: User, label: '画像' },
]

export function MainLayoutClient({ user, children }: { user: { id: string; username: string; avatar: string | null } | null; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { theme, setTheme } = useTheme()
  const fontSize = useUiStore((s) => s.fontSize)

  useEffect(() => {
    if (user) setAuth({ userId: user.id, username: user.username, avatar: user.avatar })
    document.documentElement.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px'
  }, [user, setAuth, fontSize])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    useAuthStore.getState().logout()
    toast.success('已退出登录')
    router.push('/login')
  }

  const cycleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
  }

  return (
    <div className="relative min-h-screen">
      <WallpaperEngine />

      <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="hidden text-sm font-bold sm:block">PersonaMate</span>
        </div>
        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="搜索对话、记忆、创作..." className="h-9 w-full rounded-lg border border-black/10 dark:border-white/10 surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={cycleTheme} title="切换主题">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" title="通知">
            <Bell className="h-4 w-4" />
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon" type="button"><Settings className="h-4 w-4" /></Button>
          </Link>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{user?.username?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={logout} title="退出">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <nav className="glass sticky top-16 z-20 flex items-center gap-1 overflow-x-auto px-3 py-2 no-scrollbar">
        {NAV.map((item) => {
          const active = !!pathname && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
          return (
            <Link key={item.href} href={item.href} className="shrink-0">
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'surface-hover'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <main className="relative mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <FloatingMusicPlayer />
    </div>
  )
}
