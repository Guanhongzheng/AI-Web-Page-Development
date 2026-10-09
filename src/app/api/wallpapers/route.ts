import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

// 动态壁纸：CSS 渐变 / Canvas 粒子 / Three.js 音乐网格
const EMOTION_PRESETS: Record<string, { colors: string[]; type: string }> = {
  aurora: { colors: ['#1e293b', '#6366f1', '#0ea5e9'], type: 'gradient' },
  'warm-glow': { colors: ['#fde68a', '#fb923c', '#f472b6'], type: 'gradient' },
  'rain-deepblue': { colors: ['#1e3a8a', '#3b82f6', '#0f172a'], type: 'gradient' },
  'starry-particles': { colors: ['#312e81', '#a78bfa'], type: 'particles' },
  'forest-gradient': { colors: ['#064e3b', '#10b981', '#84cc16'], type: 'gradient' },
  'music-grid': { colors: ['#7c2d12', '#f97316'], type: 'music' },
  ember: { colors: ['#7f1d1d', '#ef4444', '#f59e0b'], type: 'gradient' },
}

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const preset = new URL(req.url).searchParams.get('preset')
    const presets = Object.entries(EMOTION_PRESETS).map(([name, v]) => ({ name, ...v }))
    if (preset && EMOTION_PRESETS[preset]) return ok({ active: { name: preset, ...EMOTION_PRESETS[preset] }, presets })
    return ok({ presets })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const body = await req.json()
    // AI 生成壁纸配置：根据 prompt 生成配色（轻量实现，生产接 Stable Diffusion 出图）
    const palette = generatePaletteFromPrompt(body.prompt || '')
    return ok({ type: 'gradient', colors: palette, source: 'ai', prompt: body.prompt })
  } catch (e) {
    return handleApiError(e)
  }
}

function generatePaletteFromPrompt(prompt: string): string[] {
  const map: [RegExp, string[]][] = [
    [/海|蓝|冷/, ['#0ea5e9', '#3b82f6', '#1e3a8a']],
    [/夕阳|橙|暖/, ['#fb923c', '#f472b6', '#fde68a']],
    [/森林|绿|自然/, ['#10b981', '#84cc16', '#064e3b']],
    [/夜|星空|紫/, ['#6366f1', '#a78bfa', '#1e1b4b']],
    [/火|红|热/, ['#ef4444', '#f59e0b', '#7f1d1d']],
  ]
  for (const [re, colors] of map) if (re.test(prompt)) return colors
  return ['#6366f1', '#a855f7', '#0ea5e9']
}
