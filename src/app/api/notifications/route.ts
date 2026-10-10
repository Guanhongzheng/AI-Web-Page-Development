import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

// GET 我的通知（含未读数）
export async function GET() {
  try {
    const uid = await requireUser()
    const list = await prisma.notification.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = list.filter((n) => !n.read).length
    return ok({ list: list.map((n) => ({ ...n, data: JSON.parse(n.data) })), unread })
  } catch (e) {
    return handleApiError(e)
  }
}
