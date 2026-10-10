import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

// GET 按用户名搜索用户 ?q=xxx
export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
    if (!q) return ok([])
    const rows = await prisma.user.findMany({
      where: { id: { not: uid }, username: { contains: q } },
      select: { id: true, username: true, avatar: true },
      take: 10,
    })
    return ok(rows)
  } catch (e) {
    return handleApiError(e)
  }
}
