'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiStore {
  glassLevel: 1 | 2 | 3
  fontSize: 'small' | 'medium' | 'large'
  animations: boolean
  emotionAdaptive: boolean
  setGlassLevel: (v: 1 | 2 | 3) => void
  setFontSize: (v: 'small' | 'medium' | 'large') => void
  setAnimations: (v: boolean) => void
  setEmotionAdaptive: (v: boolean) => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      glassLevel: 2,
      fontSize: 'medium',
      animations: true,
      emotionAdaptive: true,
      setGlassLevel: (v) => set({ glassLevel: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setAnimations: (v) => set({ animations: v }),
      setEmotionAdaptive: (v) => set({ emotionAdaptive: v }),
    }),
    { name: 'pm-ui' },
  ),
)
