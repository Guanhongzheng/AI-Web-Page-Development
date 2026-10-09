import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError, fail } from '@/lib/api'

// 添加 AI 进群
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: uid } },
    })
    if (!member) return fail('无权限', 403)
    const conv = await prisma.conversation.findUnique({ where: { id: params.id } })
    if (!conv || conv.type !== 'group') return fail('仅群聊可添加 AI', 400)
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: params.id, userId: 'ai-companion' } },
      update: {},
      create: { conversationId: params.id, userId: 'ai-companion', role: 'ai', isAi: true },
    })
    return ok({ added: true })
  } catch (e) {
    return handleApiError(e)
  }
}

// 将 AI 移出群
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: uid } },
    })
    if (!member) return fail('无权限', 403)
    await prisma.conversationMember.deleteMany({
      where: { conversationId: params.id, userId: 'ai-companion' },
    })
    return ok({ removed: true })
  } catch (e) {
    return handleApiError(e)
  }
}
