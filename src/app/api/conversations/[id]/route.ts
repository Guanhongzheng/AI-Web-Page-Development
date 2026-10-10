import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError, fail } from '@/lib/api'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const convId = params.id
    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId: convId, userId: uid },
    })
    if (!membership) return fail('无权操作该会话', 403)
    await prisma.conversation.delete({ where: { id: convId } })
    return ok(null)
  } catch (e) {
    return handleApiError(e)
  }
}
