'use client'
import { create } from 'zustand'
import type { MusicTrack } from '@/lib/types'

interface NeteaseStatus {
  checking: boolean
  connected: boolean
  loggedIn: boolean
  nickname?: string | null
  latency?: number
  error?: string
}

interface MusicStore {
  playlist: MusicTrack[]
  currentIndex: number
  isPlaying: boolean
  volume: number
  current?: MusicTrack
  netease: NeteaseStatus
  setPlaylist: (list: MusicTrack[], startIndex?: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  refreshNeteaseStatus: () => Promise<NeteaseStatus>
  recommendReason?: string
  setRecommendReason: (r?: string) => void
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  volume: 70,
  netease: { checking: false, connected: false, loggedIn: false },
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
  refreshNeteaseStatus: async () => {
    set({ netease: { ...get().netease, checking: true } })
    try {
      const res = await fetch('/api/music/status').then((r) => r.json())
      const st: NeteaseStatus = {
        checking: false,
        connected: !!res?.data?.connected,
        loggedIn: !!res?.data?.loggedIn,
        nickname: res?.data?.nickname ?? null,
        latency: res?.data?.latency,
      }
      set({ netease: st })
      return st
    } catch (e: any) {
      const st: NeteaseStatus = { checking: false, connected: false, loggedIn: false, error: e?.message ?? '连接失败' }
      set({ netease: st })
      return st
    }
  },
  setRecommendReason: (r) => set({ recommendReason: r }),
}))
