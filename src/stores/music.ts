'use client'
import { create } from 'zustand'
import type { MusicTrack } from '@/lib/types'

interface MusicStore {
  playlist: MusicTrack[]
  currentIndex: number
  isPlaying: boolean
  volume: number
  current?: MusicTrack
  setPlaylist: (list: MusicTrack[], startIndex?: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  recommendReason?: string
  setRecommendReason: (r?: string) => void
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  volume: 70,
  setPlaylist: (list, startIndex = 0) =>
    set({ playlist: list, currentIndex: startIndex, current: list[startIndex], isPlaying: true }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () => {
    const { playlist, currentIndex } = get()
    const i = (currentIndex + 1) % Math.max(playlist.length, 1)
    set({ currentIndex: i, current: playlist[i], isPlaying: true })
  },
  prev: () => {
    const { playlist, currentIndex } = get()
    const i = (currentIndex - 1 + playlist.length) % Math.max(playlist.length, 1)
    set({ currentIndex: i, current: playlist[i], isPlaying: true })
  },
  setVolume: (v) => set({ volume: v }),
  setRecommendReason: (r) => set({ recommendReason: r }),
}))
