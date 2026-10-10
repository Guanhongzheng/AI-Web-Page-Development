import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from './db'

const GEN_HINT =
  '生成方式：node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'

/**
 * 签发 / 校验 JWT 的密钥必须由环境变量 JWT_SECRET 提供。
 *
 * 这里刻意**不提供内置兜底值**：若使用公开的固定默认值，
 * 任何人都能伪造合法 token 冒充任意用户登录。
 */
function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) {
    throw new Error(`缺少环境变量 JWT_SECRET，拒绝以不安全方式签发/校验令牌。请在 .env 中配置随机密钥。${GEN_HINT}`)
  }
  if (s.length < 16) {
    throw new Error(`环境变量 JWT_SECRET 强度不足：至少 16 个字符，建议使用 32 字节随机值。${GEN_HINT}`)
  }
  return s
}

export function signToken(userId: string) {
  return jwt.sign({ uid: userId }, getSecret(), { expiresIn: '30d' })
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = cookies().get('pm_token')?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, getSecret()) as { uid: string }
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
