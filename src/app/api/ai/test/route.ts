import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'
import { testConnection } from '@/lib/ai-gateway'
import { decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { id, provider, baseUrl, apiKey, model } = await req.json()
    let cfg
    if (id) {
      const row = await prisma.aiProvider.findFirst({ where: { id, userId: uid } })
      if (!row) return Response.json({ ok: false, error: '未找到配置' })
      cfg = { provider: row.provider as any, baseUrl: row.baseUrl, apiKey: decrypt(row.apiKeyEnc), model: row.model }
    } else {
      cfg = { provider, baseUrl, apiKey, model }
    }
    const result = await testConnection(cfg)
    return ok(result)
  } catch (e) {
    return handleApiError(e)
  }
}
