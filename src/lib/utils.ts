import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function relativeTime(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}天前`
  return formatDate(date)
}

export function maskApiKey(key: string) {
  if (!key) return ''
  if (key.length <= 10) return '****'
  return `${key.slice(0, 6)}****${key.slice(-4)}`
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function emotionMeta(label: string) {
  const map: Record<string, { emoji: string; color: string; text: string }> = {
    happy: { emoji: '😊', color: '#fbbf24', text: '开心' },
    sad: { emoji: '😢', color: '#3b82f6', text: '难过' },
    anxious: { emoji: '😰', color: '#a78bfa', text: '焦虑' },
    angry: { emoji: '😠', color: '#ef4444', text: '生气' },
    calm: { emoji: '😌', color: '#10b981', text: '平静' },
    excited: { emoji: '🤩', color: '#f97316', text: '兴奋' },
    neutral: { emoji: '😐', color: '#94a3b8', text: '平静' },
  }
  return map[label] ?? map.neutral
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
