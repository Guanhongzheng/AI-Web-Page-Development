import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

export async function GET() {
  const uid = await getCurrentUserId()
  if (!uid) return fail('未登录', 401)
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, username: true, email: true, avatar: true, profile: true },
  })
  return ok(user)
}
