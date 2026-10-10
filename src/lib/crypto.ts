import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

const GEN_HINT =
  '生成方式：node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'

/**
 * 加密密钥必须由环境变量 ENCRYPTION_KEY 提供（64 位十六进制 = 32 字节）。
 *
 * 这里刻意**不提供任何内置兜底密钥**：一旦缺失或格式非法就抛出异常。
 * 否则在未配置环境变量时会退化成「用公开的默认密钥加密用户数据」，
 * 等于加密形同虚设（API Key 等敏感信息可被任何人解密）。
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      `缺少环境变量 ENCRYPTION_KEY，拒绝以不安全方式启动。请在 .env 中配置 64 位十六进制密钥。${GEN_HINT}`,
    )
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(`环境变量 ENCRYPTION_KEY 格式非法：需为 64 位十六进制字符串（32 字节）。${GEN_HINT}`)
  }
  return Buffer.from(raw, 'hex')
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid ciphertext')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

export function hashToken(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export function randomId(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex')
}
