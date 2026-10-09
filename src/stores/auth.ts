'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  userId: string | null
  username: string | null
  avatar: string | null
  setAuth: (u: { userId: string; username: string; avatar?: string | null }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      avatar: null,
      setAuth: (u) => set({ userId: u.userId, username: u.username, avatar: u.avatar ?? null }),
      logout: () => set({ userId: null, username: null, avatar: null }),
    }),
    { name: 'pm-auth' },
  ),
)
