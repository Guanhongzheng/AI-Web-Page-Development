import { Server } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'

type NextResponseWithSocket = NextApiResponse & {
  socket: { server: { io?: Server } }
}

const onlineUsers = new Map<string, Set<string>>() // userId -> socketIds

export default function handler(req: NextApiRequest, res: NextResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server as any, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      cors: { origin: '*' },
    })

    io.on('connection', (socket) => {
      const userId = (socket.handshake.auth as { userId?: string }).userId
      if (!userId) {
        socket.disconnect()
        return
      }
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
      onlineUsers.get(userId)!.add(socket.id)
      socket.join(`user:${userId}`)
      io.emit('presence', { userId, online: true })

      socket.on('join-conversation', (convId: string) => {
        socket.join(`conv:${convId}`)
        io.to(`conv:${convId}`).emit('presence', { userId, online: true })
      })

      socket.on('typing', ({ convId, isTyping }: { convId: string; isTyping: boolean }) => {
        socket.to(`conv:${convId}`).emit('typing', { userId, isTyping })
      })

      socket.on('message-read', ({ convId, messageId }: { convId: string; messageId: string }) => {
        socket.to(`conv:${convId}`).emit('message-read', { userId, messageId })
      })

      socket.on('new-message', (msg: unknown) => {
        // 广播给同会话其他成员
        const convId = (msg as { conversationId?: string }).conversationId
        if (convId) socket.to(`conv:${convId}`).emit('new-message', msg)
      })

      socket.on('disconnect', () => {
        const set = onlineUsers.get(userId)
        set?.delete(socket.id)
        if (set && set.size === 0) {
          onlineUsers.delete(userId)
          io.emit('presence', { userId, online: false })
        }
      })
    })

    res.socket.server.io = io
  }
  res.end()
}
