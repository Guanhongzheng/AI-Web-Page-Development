'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { WallpaperEngine } from '@/components/wallpaper-engine'
import { IntroHero } from '@/components/lock-screen'
import { FloatingMusicPlayer } from '@/components/floating-music-player'
import { NotificationsPopover } from '@/components/notifications-popover'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useMusicStore } from '@/stores/music'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Home, MessageCircle, Brain, Palette, TrendingUp, User, Settings,
  Search, LogOut, Sparkles, ArrowUpToLine,
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
  const fontSize = useUiStore((s) => s.fontSize)
  const animations = useUiStore((s) => s.animations)
  const glassLevel = useUiStore((s) => s.glassLevel)
  const texCls = glassLevel === 1 ? 'glass-light' : glassLevel === 3 ? 'glass-strong' : glassLevel === 4 ? 'glass-flat' : 'glass'
  const isFlat = glassLevel === 4

  // 扁平化模式：给根元素打标记，全局强制卡片实心不透明
  useEffect(() => {
    document.documentElement.classList.toggle('ui-flat', isFlat)
  }, [isFlat])
  const refreshNetease = useMusicStore((s) => s.refreshNeteaseStatus)
  const [searchQ, setSearchQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{ conversations: any[]; memories: any[]; users: any[] }>({ conversations: [], memories: [], users: [] })
  const searchRef = useRef<HTMLInputElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)
  // 是否已进入主应用区（滚过介绍页）：控制 Dock / 顶栏按钮区 / 播放器显示
  const [showChrome, setShowChrome] = useState(false)

  // 路由切换：有浏览器记忆(cookie)则主页直接进入应用，否则展示介绍页；子页默认在应用区
  useEffect(() => {
    const vh = window.innerHeight
    const entered = document.cookie.split('; ').some((c) => c.startsWith('pm_entered='))
    if (pathname === '/') {
      window.scrollTo({ top: entered ? vh : 0, behavior: 'auto' })
      setShowChrome(entered)
    } else {
      document.cookie = 'pm_entered=1; path=/; max-age=604800; SameSite=Lax'
      window.scrollTo({ top: 0, behavior: 'auto' })
      setShowChrome(true)
    }
  }, [pathname])

  // 根据滚动位置更新 chrome 显示（带滞回，避免点击/微滚动导致导航栏闪烁消失）
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const vh = window.innerHeight
      setShowChrome((prev) => (y >= vh * 0.5 ? true : y < vh * 0.2 ? false : prev))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 介绍页 → 主应用：滚轮向下一次进入主应用；进入后向上滚动不再回到介绍页
  useEffect(() => {
    if (pathname !== '/') return
    let lock = false
    const onWheel = (e: WheelEvent) => {
      const y = window.scrollY
      const vh = window.innerHeight
      // 已进入主应用：主页内容可内部滚动；仅当内容已在顶部时，阻止向上滚回介绍页
      if (y >= vh * 0.5 && e.deltaY < 0) {
        const sc = mainScrollRef.current
        if (sc && sc.scrollTop > 0) return // 内容未到顶，照常内部上滚
        if (y <= vh + 4) e.preventDefault() // 内容已到顶，阻止回到介绍页
        return
      }
      if (lock) return
      // 在介绍页：向下滚一下进入主应用，并写入浏览器记忆
      if (e.deltaY > 24 && y < vh * 0.5) {
        e.preventDefault()
        lock = true
        document.cookie = 'pm_entered=1; path=/; max-age=604800; SameSite=Lax'
        setShowChrome(true)
        window.scrollTo({ top: vh, behavior: 'smooth' })
        window.setTimeout(() => { lock = false }, 750)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [pathname])

  // 全局快捷键：Ctrl/Cmd+K 聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 顶栏全局搜索（防抖）
  useEffect(() => {
    const q = searchQ.trim()
    if (!q) { setSearchResults({ conversations: [], memories: [], users: [] }); return }
    const t = setTimeout(async () => {
      try {
        const json = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json())
        setSearchResults(json.data ?? { conversations: [], memories: [], users: [] })
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  const go = (href: string) => { setSearchOpen(false); setSearchQ(''); router.push(href) }

  useEffect(() => {
    if (user) setAuth({ userId: user.id, username: user.username, avatar: user.avatar })
    document.documentElement.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px'
  }, [user, setAuth, fontSize])

  // 进入网页自动连接网易云音乐
  useEffect(() => {
    let done = false
    refreshNetease().then((st) => {
      if (done) return
      done = true
      if (st.connected) {
        toast.success(st.loggedIn ? `已连接网易云${st.nickname ? `（${st.nickname}）` : ''}` : '已连接网易云音乐')
      } else {
        toast.warning('网易云音乐未连接，请检查本地服务（默认 3003 端口）是否启动')
      }
    })
    return () => { done = true }
  }, [refreshNetease])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    useAuthStore.getState().logout()
    toast.success('已退出登录')
    router.push('/login')
  }

  return (
    <MotionConfig transition={animations ? undefined : { duration: 0, delay: 0, staggerChildren: 0 }}>
    <div className="relative flex min-h-screen flex-col">
      <WallpaperEngine />

      {/* 网站介绍首屏：仅主页展示，占据第一屏，向下滚动进入主应用 */}
      {pathname === '/' && <IntroHero />}

      <header className={`${texCls} sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6`} style={{ backgroundColor: isFlat ? 'hsl(var(--card))' : 'color-mix(in srgb, hsl(var(--background)) 68%, transparent)' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="hidden text-sm font-bold tracking-wide sm:block">PersonaMate</span>
        </div>
        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            placeholder="搜索对话、记忆、用户…  (Ctrl+K)"
            className="h-9 w-full rounded-lg border border-border bg-popover pl-9 pr-3 text-sm text-popover-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
          />
          {searchOpen && searchQ.trim() && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
              <div className="absolute left-0 right-0 top-11 z-40 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
                {(['conversations', 'memories', 'users'] as const).map((group) => {
                  const items = searchResults[group] ?? []
                  if (!items.length) return null
                  const Icon = group === 'conversations' ? MessageCircle : group === 'memories' ? Brain : User
                  const label = group === 'conversations' ? '对话' : group === 'memories' ? '记忆' : '用户'
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
                      {items.map((it: any) => (
                        <button
                          key={group + it.id}
                          onClick={() => go(group === 'users' ? '/chat' : group === 'memories' ? '/memory' : `/chat/${it.id}`)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{it.title}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
                {searchResults.conversations.length + searchResults.memories.length + searchResults.users.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">没有找到相关结果</p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" type="button" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setShowChrome(false) }} title="回到介绍页">
            <ArrowUpToLine className="h-4 w-4" />
          </Button>
          <NotificationsPopover />
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

      <main className="relative mx-auto h-[calc(100vh-4rem)] w-full max-w-[1750px] overflow-hidden px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pathname}
            ref={mainScrollRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="no-scrollbar h-full overflow-y-auto pr-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 底部 Dock 导航栏：仅在主应用区显示，介绍页隐藏 */}
      <nav
        className={`${texCls} ${isFlat ? '' : 'glass-shine'} fixed bottom-4 left-1/2 z-40 flex items-center gap-1.5 rounded-2xl border border-border p-2 shadow-2xl transition-all duration-300 ${showChrome ? 'opacity-100' : 'pointer-events-none translate-y-24 opacity-0'}`}
        style={{
          backgroundColor: isFlat ? 'hsl(var(--card))' : 'color-mix(in srgb, hsl(var(--background)) 82%, transparent)',
          transform: 'translateX(-50%)',
        }}
      >
        {NAV.map((item) => {
          const active = !!pathname && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.92 }}
                className={`flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-medium transition-colors ${
                  active
                    ? 'border-primary/40 bg-primary/15 text-primary shadow-lg'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                }`}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {showChrome && <FloatingMusicPlayer />}
    </div>
    </MotionConfig>
  )
}
