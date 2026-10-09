import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { id, accept } = await req.json()
    const fs = await prisma.friendship.findUnique({ where: { id } })
    if (!fs) return fail('请求不存在', 404)
    if (fs.userBId !== uid) return fail('无权操作', 403)
    if (accept) {
      await prisma.friendship.update({ where: { id }, data: { status: 'accepted' } })
      // 自动创建单聊会话
      await prisma.conversation.create({
        data: {
          type: 'user',
          members: { create: [{ userId: fs.userAId }, { userId: fs.userBId }] },
        },
      })
    } else {
      await prisma.friendship.delete({ where: { id } })
    }
    return ok({ ok: true })
  } catch (e) {
    return handleApiError(e)
  }
}
