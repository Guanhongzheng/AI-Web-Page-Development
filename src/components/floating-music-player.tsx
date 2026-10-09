'use client'
import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMusicStore } from '@/stores/music'
import { useEmotionStore } from '@/stores/emotion'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { motion, AnimatePresence } from 'framer-motion'
import { EMOTION_THEMES } from '@/stores/emotion'

export function FloatingMusicPlayer() {
  const { current, isPlaying, playlist, volume, toggle, next, prev, setVolume } =
    useMusicStore()
  const emotion = useEmotionStore((s) => s.current)
  const [expanded, setExpanded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prompted = useRef(false)
  if (typeof Audio !== 'undefined' && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.loop = false
  }

  // 真实音频播放
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (current.url && audio.src !== current.url) audio.src = current.url
    audio.volume = Math.max(0, Math.min(1, volume / 100))
    if (isPlaying) {
      audio.play().catch(() => {
        useMusicStore.setState({ isPlaying: false })
        if (!prompted.current) {
          prompted.current = true
          toast('浏览器限制自动播放，请点击右下角播放按钮开始')
        }
      })
    } else {
      audio.pause()
    }
  }, [current?.url, isPlaying, volume, current])

  // 播完自动下一首
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => next()
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [next])

  // 频谱可视化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bars = 24
      const w = canvas.width / bars
      const t = Date.now() / 300
      for (let i = 0; i < bars; i++) {
        const h = isPlaying
          ? (Math.abs(Math.sin(t + i * 0.4)) * 0.7 + 0.3) * canvas.height
          : 4
        const theme = EMOTION_THEMES[emotion.label]
        ctx.fillStyle = theme.colors[1]
        ctx.globalAlpha = 0.8
        ctx.fillRect(i * w + 1, canvas.height - h, w - 2, h)
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, emotion.label, expanded])

  if (playlist.length === 0) return null

  const accent = EMOTION_THEMES[emotion.label]?.colors[1] ?? '#a855f7'

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass glass-shine relative w-72 rounded-2xl p-3 sm:w-80"
          >
            <canvas ref={canvasRef} width={240} height={36} className="mb-2 h-9 w-full rounded-md bg-black/20" />
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{current?.name ?? '未播放'}</p>
                <p className="truncate text-xs text-muted-foreground">{current?.artist ?? ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); prev() }}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="glass" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); toggle() }}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); next() }}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0] ?? 50)}
                max={100}
                className="w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 圆形控制按钮：点击展开/收起，中间按钮播放/暂停 */}
      <motion.button
        onClick={() => setExpanded((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="glass glass-shine relative flex h-14 w-14 items-center justify-center rounded-full"
        style={{ boxShadow: `0 6px 24px ${accent}55` }}
        title={expanded ? '收起播放器' : '展开播放器'}
      >
        {isPlaying && (
          <span
            className="absolute inset-0 animate-ping rounded-full"
            style={{ background: `${accent}22` }}
          />
        )}
        <Button
          variant="glass"
          size="icon"
          className="relative z-10 h-10 w-10 rounded-full"
          onClick={(e) => { e.stopPropagation(); toggle() }}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        {expanded && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground shadow">
            <X className="h-3 w-3" />
          </span>
        )}
      </motion.button>
    </div>
  )
}
