import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

export async function GET() {
  try {
    const uid = await requireUser()
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ userAId: uid }, { userBId: uid }] },
      include: {
        userA: { select: { id: true, username: true, avatar: true } },
        userB: { select: { id: true, username: true, avatar: true } },
      },
    })
    return ok(rows)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { targetId } = await req.json()
    if (targetId === uid) return fail('不能添加自己', 400)
    const exists = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: uid, userBId: targetId },
          { userAId: targetId, userBId: uid },
        ],
      },
    })
    if (exists) return fail('已存在好友关系', 409)
    const row = await prisma.friendship.create({ data: { userAId: uid, userBId: targetId, status: 'pending' } })
    return ok(row)
  } catch (e) {
    return handleApiError(e)
  }
}
