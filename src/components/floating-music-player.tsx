'use client'
import { useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, Music } from 'lucide-react'
import { useMusicStore } from '@/stores/music'
import { useEmotionStore } from '@/stores/emotion'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { motion, AnimatePresence } from 'framer-motion'
import { EMOTION_THEMES } from '@/stores/emotion'

export function FloatingMusicPlayer() {
  const { current, isPlaying, playlist, volume, toggle, next, prev, setVolume, recommendReason } =
    useMusicStore()
  const emotion = useEmotionStore((s) => s.current)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (typeof Audio !== 'undefined' && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.loop = false
  }

  // 真实音频播放：跟随当前曲目 / 播放状态 / 音量
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (current.url && audio.src !== current.url) audio.src = current.url
    audio.volume = Math.max(0, Math.min(1, volume / 100))
    if (isPlaying) {
      audio.play().catch(() => useMusicStore.setState({ isPlaying: false }))
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
  }, [isPlaying, emotion.label])

  if (playlist.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="glass glass-shine fixed bottom-4 right-4 z-40 flex w-80 items-center gap-3 rounded-2xl p-3"
      >
        <canvas ref={canvasRef} width={96} height={36} className="h-9 w-24 rounded-md bg-black/20" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{current?.name ?? '未播放'}</p>
          <p className="truncate text-xs text-muted-foreground">{current?.artist ?? ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="glass" size="icon" className="h-9 w-9" onClick={toggle}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider
            value={[volume]}
            onValueChange={(v) => setVolume(v[0] ?? 50)}
            max={100}
            className="w-16"
          />
        </div>
        {recommendReason && (
          <div className="absolute -top-2 left-3 rounded-full bg-primary/80 px-2 py-0.5 text-[10px] text-primary-foreground">
            <Music className="mr-1 inline h-3 w-3" />
            {recommendReason}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
