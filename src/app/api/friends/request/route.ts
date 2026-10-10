import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

// POST 发起好友请求 body { userId }
export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { userId } = await req.json()
    if (!userId || userId === uid) return fail('无效的用户 ID', 400)
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
    if (!target) return fail('用户不存在', 404)

    // 已存在关系则不重复创建
    const exist = await prisma.friendship.findFirst({
      where: { OR: [{ userAId: uid, userBId: userId }, { userAId: userId, userBId: uid }] },
    })
    if (exist) {
      if (exist.status === 'accepted') return fail('你们已经是好友了', 400)
      return ok({ requested: true, status: exist.status })
    }
    await prisma.friendship.create({ data: { userAId: uid, userBId: userId, status: 'pending' } })
    const me = await prisma.user.findUnique({ where: { id: uid }, select: { username: true } })
    await prisma.notification.create({
      data: {
        userId,
        type: 'friend_request',
        data: JSON.stringify({ fromUserId: uid, fromUsername: me?.username ?? '某位用户' }),
      },
    })
    return ok({ requested: true })
  } catch (e) {
    return handleApiError(e)
  }
}
