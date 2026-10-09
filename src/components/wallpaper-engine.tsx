'use client'
import { useEffect, useRef } from 'react'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useEmotionStore } from '@/stores/emotion'

function GradientWallpaper({ colors }: { colors: string[] }) {
  const [c1, c2, c3] = colors
  return (
    <div
      className="wallpaper-transition absolute inset-0"
      style={{
        background: `linear-gradient(135deg, ${c1 ?? '#1e293b'}, ${c2 ?? '#6366f1'}, ${c3 ?? c2 ?? '#0ea5e9'})`,
        backgroundSize: '200% 200%',
        animation: 'gradient-shift 15s ease infinite',
      }}
    >
      <style>{`@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1),transparent_40%)]" />
    </div>
  )
}

function RainWallpaper({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const drops = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 10 + Math.random() * 20,
      speed: 4 + Math.random() * 6,
      opacity: 0.2 + Math.random() * 0.5,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const d of drops) {
        ctx.strokeStyle = `rgba(147,197,253,${d.opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x, d.y + d.len)
        ctx.stroke()
        d.y += d.speed
        if (d.y > canvas.height) {
          d.y = -d.len
          d.x = Math.random() * canvas.width
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return (
    <div className="wallpaper-transition absolute inset-0" style={{ background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})` }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

function StarryWallpaper({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      speed: 0.005 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
    }))
    let t = 0
    const draw = () => {
      ctx.fillStyle = 'rgba(15,23,42,0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      t += 0.016
      for (const s of stars) {
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * s.speed * 60 + s.phase))
        ctx.fillStyle = `rgba(196,181,253,${alpha})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return (
    <div className="wallpaper-transition absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

function MusicGridWallpaper({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let t = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      t += 0.02
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cols = 40
      const barW = canvas.width / cols
      for (let i = 0; i < cols; i++) {
        const h = (Math.sin(t + i * 0.3) * 0.5 + 0.5) * (canvas.height * 0.7) + 20
        const gradient = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height)
        gradient.addColorStop(0, colors[1] ?? '#f97316')
        gradient.addColorStop(1, 'rgba(255,255,255,0.05)')
        ctx.fillStyle = gradient
        ctx.fillRect(i * barW + 2, canvas.height - h, barW - 4, h)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [colors])
  return (
    <div className="wallpaper-transition absolute inset-0" style={{ background: `linear-gradient(180deg, ${colors[0]}, #0f172a)` }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

export function WallpaperEngine() {
  const { config, transitionKey } = useWallpaperStore()
  const current = useEmotionStore((s) => s.current)
  const adaptive = useEmotionStore((s) => s.adaptiveEnabled)
  const effective = adaptive && current.label !== 'neutral' && current.intensity > 40 ? current.label : config.emotion

  const renderWallpaper = () => {
    const colors = config.colors ?? ['#1e293b', '#6366f1']
    if (effective === 'sad') return <RainWallpaper key="sad" colors={['#1e3a8a', '#0f172a']} />
    if (effective === 'anxious') return <StarryWallpaper key="anxious" colors={['#312e81', '#1e1b4b']} />
    if (effective === 'excited' || config.type === 'music') return <MusicGridWallpaper key="music" colors={colors} />
    if (config.type === 'particles') return <StarryWallpaper key="particles" colors={colors} />
    return <GradientWallpaper key="gradient" colors={colors} />
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div key={transitionKey} className="wallpaper-transition absolute inset-0 animate-fade-in">
        {renderWallpaper()}
      </div>
      <div className="absolute inset-0 bg-black/10" />
    </div>
  )
}
