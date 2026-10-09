import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError, fail } from '@/lib/api'

export async function GET() {
  try {
    const uid = await requireUser()
    const convs = await prisma.conversation.findMany({
      where: { members: { some: { userId: uid } } },
      include: {
        members: { include: { user: { select: { id: true, username: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    // 确保用户至少有一个 AI 伴侣会话
    let aiConv = convs.find((c) => c.type === 'ai')
    if (!aiConv) {
      aiConv = await prisma.conversation.create({
        data: {
          type: 'ai',
          name: 'PersonaMate',
          members: { create: [{ userId: uid, role: 'owner' }, { userId: 'ai-companion', role: 'ai', isAi: true }] },
        },
        include: { members: { include: { user: { select: { id: true, username: true, avatar: true } } } }, messages: { take: 1 }, _count: { select: { messages: true } } },
      })
      // 创建虚拟 AI 用户
      await prisma.user.upsert({
        where: { id: 'ai-companion' },
        update: {},
        create: { id: 'ai-companion', username: 'PersonaMate', email: 'ai@personamate.local', passwordHash: 'x' },
      })
    }
    return ok(convs)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { type, name, memberIds } = await req.json()
    if (!['ai', 'user', 'group'].includes(type)) return fail('无效会话类型', 400)
    const members: { userId: string; role: string; isAi?: boolean }[] = [{ userId: uid, role: 'owner' }]
    if (type === 'ai') {
      members.push({ userId: 'ai-companion', role: 'ai' as const, isAi: true })
    } else if (type === 'user' && memberIds?.[0]) {
      members.push({ userId: memberIds[0], role: 'member' as const })
    } else if (type === 'group') {
      for (const id of memberIds ?? []) members.push({ userId: id, role: 'member' as const })
      members.push({ userId: 'ai-companion', role: 'ai' as const, isAi: true })
    }
    const conv = await prisma.conversation.create({
      data: { type, name, members: { create: members }, ...(type === 'group' ? { settings: { create: {} } } : {}) },
    })
    return ok(conv)
  } catch (e) {
    return handleApiError(e)
  }
}
