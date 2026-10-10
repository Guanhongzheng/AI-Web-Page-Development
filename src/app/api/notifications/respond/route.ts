import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

// POST 响应通知 body { notificationId, accept }
export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { notificationId, accept } = await req.json()
    const n = await prisma.notification.findUnique({ where: { id: notificationId } })
    if (!n || n.userId !== uid) return fail('通知不存在', 404)
    const data = JSON.parse(n.data)

    if (n.type === 'friend_request') {
      const fromId = data.fromUserId
      const f = await prisma.friendship.findFirst({
        where: { OR: [{ userAId: fromId, userBId: uid }, { userAId: uid, userBId: fromId }] },
      })
      if (f) {
        if (accept) await prisma.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } })
        else await prisma.friendship.delete({ where: { id: f.id } })
      }
    } else if (n.type === 'group_invite') {
      if (accept && data.conversationId) {
        await prisma.conversationMember.upsert({
          where: { conversationId_userId: { conversationId: data.conversationId, userId: uid } },
          update: {},
          create: { conversationId: data.conversationId, userId: uid, role: 'member' },
        })
      }
    }
    await prisma.notification.update({ where: { id: n.id }, data: { read: true } })
    return ok({ done: true, accept })
  } catch (e) {
    return handleApiError(e)
  }
}
