'use client'
import { useEffect, useRef } from 'react'
import { useWallpaperStore } from '@/stores/wallpaper'
import { useEmotionStore } from '@/stores/emotion'
import { useUiStore } from '@/stores/ui'

// RGB(0-255) → HSL，h 为角度(0-360)，s/l 为百分比(0-100)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function ImageWallpaper({ src }: { src: string }) {
  if (/\.html(\?|$)/i.test(src)) {
    return (
      <iframe
        src={src}
        title="wallpaper"
        className="absolute inset-0 h-full w-full border-0"
        style={{ pointerEvents: 'none' }}
      />
    )
  }
  return (
    <div
      className="wallpaper-transition absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${src})` }}
    />
  )
}

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
  const wallpaper = useUiStore((s) => s.wallpaper)
  const bgBlur = useUiStore((s) => s.bgBlur)
  const effective = adaptive && current.label !== 'neutral' && current.intensity > 40 ? current.label : config.emotion

  // 根据壁纸自动取色，生成一套舒适的协调配色（深色界面 + 主题色调，文字始终清晰）
  useEffect(() => {
    const root = document.documentElement
    const reset = () => {
      ;['--primary', '--ring', '--card', '--popover', '--muted', '--border', '--input', '--secondary', '--secondary-foreground', '--accent', '--accent-foreground'].forEach((k) => root.style.removeProperty(k))
    }
    if (!wallpaper || /\.html(\?|$)/i.test(wallpaper)) {
      reset()
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          const rr = data[i]
          const gg = data[i + 1]
          const bb = data[i + 2]
          const mx = Math.max(rr, gg, bb)
          const mn = Math.min(rr, gg, bb)
          if (mx - mn < 18) continue
          if (mx > 235 && mn > 235) continue
          if (mx < 25) continue
          r += rr
          g += gg
          b += bb
          count++
        }
        if (count === 0) {
          reset()
          return
        }
        const [h] = rgbToHsl(r / count, g / count, b / count)
        const sat = 80
        // 同一色相、不同明度/饱和度，构成舒适且有层次的配色
        const vars: Record<string, string> = {
          '--primary': `${h} ${sat}% 58%`,
          '--ring': `${h} ${sat}% 58%`,
          '--card': `${h} 24% 13%`,
          '--popover': `${h} 24% 13%`,
          '--muted': `${h} 20% 19%`,
          '--border': `${h} 24% 24%`,
          '--input': `${h} 24% 24%`,
          '--secondary': `${h} 22% 17%`,
          '--secondary-foreground': `${h} 30% 92%`,
          '--accent': `${h} 45% 24%`,
          '--accent-foreground': `${h} 60% 86%`,
        }
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
      } catch {
        reset()
      }
    }
    img.onerror = reset
    img.src = wallpaper
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [wallpaper])

  const renderWallpaper = () => {
    if (wallpaper) return <ImageWallpaper key={wallpaper} src={wallpaper} />
    const colors = config.colors ?? ['#1e293b', '#6366f1']
    if (effective === 'sad') return <RainWallpaper key="sad" colors={['#1e3a8a', '#0f172a']} />
    if (effective === 'anxious') return <StarryWallpaper key="anxious" colors={['#312e81', '#1e1b4b']} />
    if (effective === 'excited' || config.type === 'music') return <MusicGridWallpaper key="music" colors={colors} />
    if (config.type === 'particles') return <StarryWallpaper key="particles" colors={colors} />
    return <GradientWallpaper key="gradient" colors={colors} />
  }

  // 即时切换：不做淡入淡出，避免切换壁纸时的渐显闪烁
  const layerKey = wallpaper
    ? `img:${wallpaper}`
    : `emotion:${transitionKey}:${effective}:${config.type}:${(config.colors ?? []).join(',')}`
  const blurStyle = bgBlur > 0 ? { filter: `blur(${bgBlur}px)`, transform: 'scale(1.08)' } : undefined

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div key={layerKey} className="absolute inset-0" style={blurStyle}>
        {renderWallpaper()}
      </div>
      <div className="absolute inset-0 bg-black/10" />
    </div>
  )
}
