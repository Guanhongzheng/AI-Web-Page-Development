import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { ok, fail } from '@/lib/api'

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  email: z.string().email(),
  password: z.string().min(6).max(64),
})

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json())
    const exists = await prisma.user.findFirst({
      where: { OR: [{ username: body.username }, { email: body.email }] },
    })
    if (exists) return fail('用户名或邮箱已存在', 409)

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(body.password, salt, 100000, 64, 'sha256').toString('hex')

    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        passwordHash: `${salt}:${hash}`,
        profile: {
          create: { displayName: body.username, persona: JSON.stringify({ interests: [], style: 'friendly' }) },
        },
        uiPreferences: { create: {} },
        themes: { create: { mode: 'system' } },
        music: { create: {} },
      },
      select: { id: true, username: true, avatar: true },
    })

    const token = signToken(user.id)
    const res = ok(user)
    res.cookies.set('pm_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch (e) {
    if (e instanceof z.ZodError) return fail('参数校验失败', 400, { issues: e.flatten() })
    return fail((e as Error).message, 500)
  }
}
