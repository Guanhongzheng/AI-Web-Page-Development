'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiStore {
  glassLevel: 1 | 2 | 3 | 4
  fontSize: 'small' | 'medium' | 'large'
  animations: boolean
  emotionAdaptive: boolean
  focusMode: boolean
  wallpaper: string
  bgBlur: number
  setGlassLevel: (v: 1 | 2 | 3 | 4) => void
  setFontSize: (v: 'small' | 'medium' | 'large') => void
  setAnimations: (v: boolean) => void
  setEmotionAdaptive: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  setWallpaper: (v: string) => void
  setBgBlur: (v: number) => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      glassLevel: 2,
      fontSize: 'medium',
      animations: true,
      emotionAdaptive: true,
      focusMode: false,
      wallpaper: '',
      bgBlur: 0,
      setGlassLevel: (v) => set({ glassLevel: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setAnimations: (v) => set({ animations: v }),
      setEmotionAdaptive: (v) => set({ emotionAdaptive: v }),
      setFocusMode: (v) => set({ focusMode: v }),
      setWallpaper: (v) => set({ wallpaper: v }),
      setBgBlur: (v) => set({ bgBlur: v }),
    }),
    { name: 'pm-ui' },
  ),
)
