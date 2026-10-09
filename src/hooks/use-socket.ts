'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'

let socketSingleton: Socket | null = null

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const userId = useAuthStore((s) => s.userId)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userId) return
    if (!socketSingleton) {
      socketSingleton = io({ path: '/api/socket', transports: ['websocket', 'polling'], autoConnect: true })
    }
    const socket = socketSingleton
    socketRef.current = socket
    socket.auth = { userId }
    if (!socket.connected) socket.connect()
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [userId])

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, cb: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, cb)
    return () => socketRef.current?.off(event, cb)
  }, [])

  return { connected, emit, on, socket: socketRef.current }
}
