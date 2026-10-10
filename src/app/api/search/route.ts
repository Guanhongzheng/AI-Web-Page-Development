import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
    if (!q) return ok({ conversations: [], memories: [], users: [] })

    const [conversations, memories, users] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          members: { some: { userId: uid } },
          OR: [{ name: { contains: q } }, { messages: { some: { content: { contains: q } } } }],
        },
        take: 5,
        select: { id: true, name: true, type: true },
      }),
      prisma.memory.findMany({
        where: { userId: uid, content: { contains: q } },
        take: 5,
        select: { id: true, content: true, type: true },
      }),
      prisma.user.findMany({
        where: { username: { contains: q }, NOT: { id: uid } },
        take: 5,
        select: { id: true, username: true },
      }),
    ])

    return ok({
      conversations: conversations.map((c) => ({ id: c.id, title: c.name ?? '会话', type: c.type })),
      memories: memories.map((m) => ({ id: m.id, title: m.content.slice(0, 40), type: m.type })),
      users: users.map((u) => ({ id: u.id, title: u.username, type: 'user' })),
    })
  } catch (e) {
    return handleApiError(e)
  }
}
