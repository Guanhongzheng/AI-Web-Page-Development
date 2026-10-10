import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

// POST 邀请进群 body { userId } → 给目标发通知，目标确认后入群
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const { userId } = await req.json()
    if (!userId) return fail('缺少用户 ID', 400)
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: uid } },
    })
    if (!member) return fail('无权限', 403)
    const conv = await prisma.conversation.findUnique({ where: { id: params.id } })
    if (!conv || conv.type !== 'group') return fail('仅群聊可邀请', 400)
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!target) return fail('用户不存在', 404)
    const already = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId } },
    })
    if (already) return fail('该用户已在群聊中', 400)
    const me = await prisma.user.findUnique({ where: { id: uid }, select: { username: true } })
    await prisma.notification.create({
      data: {
        userId,
        type: 'group_invite',
        data: JSON.stringify({ fromUserId: uid, fromUsername: me?.username ?? '某位用户', conversationId: params.id, convName: conv.name ?? '群聊' }),
      },
    })
    return ok({ invited: true })
  } catch (e) {
    return handleApiError(e)
  }
}
