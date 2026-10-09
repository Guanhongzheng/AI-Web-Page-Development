'use client'
import { create } from 'zustand'
import type { EmotionLabel, EmotionState } from '@/lib/types'

interface EmotionStore {
  current: EmotionState
  history: EmotionState[]
  adaptiveEnabled: boolean
  setEmotion: (e: EmotionState) => void
  setAdaptive: (v: boolean) => void
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  current: { label: 'neutral', intensity: 30, confidence: 0.6 },
  history: [],
  adaptiveEnabled: true,
  setEmotion: (e) =>
    set((s) => ({
      current: e,
      history: [...s.history.slice(-23), e],
    })),
  setAdaptive: (v) => set({ adaptiveEnabled: v }),
}))

export const EMOTION_THEMES: Record<
  EmotionLabel,
  { wallpaper: string; colors: [string, string]; music: string; font: string }
> = {
  happy: { wallpaper: 'warm-glow', colors: ['#fde68a', '#fb923c'], music: '轻快流行', font: 'rounded' },
  sad: { wallpaper: 'rain-deepblue', colors: ['#1e3a8a', '#3b82f6'], music: '钢琴纯音', font: 'serif' },
  anxious: { wallpaper: 'starry-particles', colors: ['#312e81', '#a78bfa'], music: '白噪音', font: 'sans' },
  angry: { wallpaper: 'ember', colors: ['#7f1d1d', '#ef4444'], music: '平缓古典', font: 'sans' },
  calm: { wallpaper: 'forest-gradient', colors: ['#064e3b', '#10b981'], music: 'Lo-fi', font: 'serif' },
  excited: { wallpaper: 'music-grid', colors: ['#7c2d12', '#f97316'], music: '电子', font: 'rounded' },
  neutral: { wallpaper: 'aurora', colors: ['#1e293b', '#6366f1'], music: '环境音乐', font: 'sans' },
}
