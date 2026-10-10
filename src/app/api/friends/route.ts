import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

// GET 好友列表 + 待处理请求
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
    const friends = []
    const incoming = []
    const outgoing = []
    for (const r of rows) {
      const other = r.userAId === uid ? r.userB : r.userA
      const item = { id: r.id, userId: other.id, username: other.username, avatar: other.avatar, status: r.status }
      if (r.status === 'accepted') friends.push(item)
      else if (r.status === 'pending') {
        if (r.userBId === uid) incoming.push(item) // 别人发给我
        else outgoing.push(item) // 我发给别人
      }
    }
    return ok({ friends, incoming, outgoing })
  } catch (e) {
    return handleApiError(e)
  }
}
