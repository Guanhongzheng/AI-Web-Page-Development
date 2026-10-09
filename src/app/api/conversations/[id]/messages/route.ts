import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError, fail } from '@/lib/api'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: uid } },
    })
    if (!member) return fail('无权限', 403)
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 100)
    const before = req.nextUrl.searchParams.get('before')
    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return ok(messages.reverse())
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uid = await requireUser()
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: params.id, userId: uid } },
    })
    if (!member) return fail('无权限', 403)
    const { content, type = 'text', emotion, emotionData } = await req.json()
    if (!content?.trim()) return fail('内容为空', 400)
    const msg = await prisma.message.create({
      data: { conversationId: params.id, senderId: uid, content, type, emotion, emotionData },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    })
    await prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
    return ok(msg)
  } catch (e) {
    return handleApiError(e)
  }
}
