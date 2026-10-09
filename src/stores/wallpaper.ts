'use client'
import { create } from 'zustand'
import type { WallpaperConfig, EmotionLabel } from '@/lib/types'

interface WallpaperStore {
  config: WallpaperConfig
  transitionKey: number
  setConfig: (c: Partial<WallpaperConfig>) => void
  applyEmotion: (e: EmotionLabel) => void
}

const EMOTION_WALLPAPER: Record<EmotionLabel, WallpaperConfig> = {
  happy: { type: 'gradient', emotion: 'happy', colors: ['#fde68a', '#fb923c', '#f472b6'] },
  sad: { type: 'gradient', emotion: 'sad', colors: ['#1e3a8a', '#3b82f6', '#0f172a'] },
  anxious: { type: 'particles', emotion: 'anxious', colors: ['#312e81', '#a78bfa'] },
  angry: { type: 'gradient', emotion: 'angry', colors: ['#7f1d1d', '#ef4444', '#f59e0b'] },
  calm: { type: 'gradient', emotion: 'calm', colors: ['#064e3b', '#10b981', '#84cc16'] },
  excited: { type: 'music', emotion: 'excited', colors: ['#7c2d12', '#f97316'] },
  neutral: { type: 'gradient', emotion: 'neutral', colors: ['#1e293b', '#6366f1', '#0ea5e9'] },
}

export const useWallpaperStore = create<WallpaperStore>((set) => ({
  config: EMOTION_WALLPAPER.neutral,
  transitionKey: 0,
  setConfig: (c) =>
    set((s) => ({ config: { ...s.config, ...c }, transitionKey: s.transitionKey + 1 })),
  applyEmotion: (e) =>
    set((s) => ({ config: EMOTION_WALLPAPER[e], transitionKey: s.transitionKey + 1 })),
}))
