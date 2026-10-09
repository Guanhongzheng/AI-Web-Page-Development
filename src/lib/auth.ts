import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from './db'

const SECRET = process.env.JWT_SECRET || 'dev-secret'

export function signToken(userId: string) {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: '30d' })
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = cookies().get('pm_token')?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, SECRET) as { uid: string }
    const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true } })
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function requireUser(): Promise<string> {
  const uid = await getCurrentUserId()
  if (!uid) throw new AuthError('未登录')
  return uid
}

export class AuthError extends Error {}
