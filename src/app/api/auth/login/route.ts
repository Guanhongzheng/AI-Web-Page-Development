import { NextRequest } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

const loginSchema = z.object({
  account: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { account, password } = loginSchema.parse(await req.json())
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: account }, { email: account }] },
      select: { id: true, username: true, avatar: true, passwordHash: true },
    })
    if (!user) return fail('账号不存在', 404)
    const [salt, hash] = user.passwordHash.split(':')
    if (!salt || !hash) return fail('账号错误', 500)
    const test = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
    if (test !== hash) return fail('密码错误', 401)

    const token = signToken(user.id)
    const res = ok({ id: user.id, username: user.username, avatar: user.avatar })
    res.cookies.set('pm_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch (e) {
    if (e instanceof z.ZodError) return fail('参数校验失败', 400)
    return fail((e as Error).message, 500)
  }
}
