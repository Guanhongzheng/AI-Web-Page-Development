'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, X, UserPlus, Users, Loader2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useUiStore } from '@/stores/ui'

export function NotificationsPopover() {
  const isFlat = useUiStore((s) => s.glassLevel) === 4
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await fetch('/api/notifications').then((r) => r.json())).data,
    refetchInterval: 15000,
  })
  const unread = data?.unread ?? 0
  const list = data?.list ?? []

  const respond = async (id: string, accept: boolean) => {
    await fetch('/api/notifications/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notificationId: id, accept }),
    })
    toast.success(accept ? '已接受' : '已拒绝')
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['friends'] })
    qc.invalidateQueries({ queryKey: ['conversations'] })
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" title="通知" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              key="notif-panel"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`${isFlat ? 'glass-flat' : 'glass glass-shine'} absolute right-0 top-11 z-50 w-[336px] origin-top-right overflow-hidden rounded-2xl border border-border text-foreground shadow-2xl`}
            >
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">通知</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">{unread} 条未读</span>
              )}
            </div>
            {/* 列表 */}
            <div className="max-h-96 space-y-1.5 overflow-y-auto p-2">
              {isLoading ? (
                <p className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />加载中...
                </p>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-50" />
                  <p className="text-xs">暂无通知</p>
                </div>
              ) : (
                list.map((n: any) => {
                  const isFriend = n.type === 'friend_request'
                  const pending = !n.read
                  return (
                    <div
                      key={n.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        pending
                          ? 'border-primary/20 bg-primary/5'
                          : 'border-border bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isFriend ? 'bg-blue-500/15 text-blue-500' : 'bg-purple-500/15 text-purple-500'
                        }`}>
                          {isFriend ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-relaxed">
                            <span className="font-semibold">{n.data?.fromUsername}</span>
                            {isFriend ? ' 请求加你为好友' : ` 邀请你加入「${n.data?.convName ?? '群聊'}」`}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                          {pending ? (
                            <div className="mt-2 flex gap-1.5">
                              <Button size="sm" className="h-6 px-2.5 text-[11px]" onClick={() => respond(n.id, true)}>
                                <Check className="mr-0.5 h-3 w-3" />接受
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2.5 text-[11px]" onClick={() => respond(n.id, false)}>
                                <X className="mr-0.5 h-3 w-3" />拒绝
                              </Button>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-[10px] text-muted-foreground">已处理</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
