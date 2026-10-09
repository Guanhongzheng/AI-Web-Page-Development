import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'
import { encrypt, decrypt } from '@/lib/crypto'
import { maskApiKey } from '@/lib/utils'
import { testConnection, getProviderDefaults } from '@/lib/ai-gateway'
import type { AiProviderConfig } from '@/lib/types'

const PROVIDERS = ['openai', 'deepseek', 'qwen', 'glm', 'moonshot', 'anthropic', 'gemini', 'ollama', 'custom'] as const

export async function GET() {
  try {
    const uid = await requireUser()
    const rows = await prisma.aiProvider.findMany({ where: { userId: uid }, orderBy: { createdAt: 'asc' } })
    return ok({
      providers: PROVIDERS,
      defaults: Object.fromEntries(PROVIDERS.map((p) => [p, getProviderDefaults(p)])),
      list: rows.map((r: { id: string; provider: string; name: string | null; baseUrl: string | null; model: string; apiKeyEnc: string; isActive: boolean; isDefault: boolean }) => ({
        id: r.id,
        provider: r.provider,
        name: r.name,
        baseUrl: r.baseUrl,
        model: r.model,
        apiKeyMasked: maskApiKey(decrypt(r.apiKeyEnc)),
        isActive: r.isActive,
        isDefault: r.isDefault,
      })),
    })
  } catch (e) {
    return handleApiError(e)
  }
}

const upsertSchema = z.object({
  provider: z.enum(PROVIDERS),
  name: z.string().optional().or(z.literal('')),
  baseUrl: z.string().optional().or(z.literal('')),
  apiKey: z.string().optional().or(z.literal('')),
  model: z.string().min(1),
  isActive: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const body = upsertSchema.parse(await req.json())
    const defaults = getProviderDefaults(body.provider)
    const baseUrl = (body.baseUrl?.trim() || defaults.baseUrl).replace(/\/+$/, '')
    const existing = await prisma.aiProvider.findUnique({
      where: { userId_provider: { userId: uid, provider: body.provider } },
    })
    let apiKeyEnc: string
    if (body.apiKey) {
      apiKeyEnc = encrypt(body.apiKey)
    } else if (existing) {
      apiKeyEnc = existing.apiKeyEnc // 未填新 Key 时保留原 Key
    } else {
      throw new Error('请填写 API Key')
    }
    const data = {
      provider: body.provider,
      name: body.name || undefined,
      baseUrl,
      apiKeyEnc,
      model: body.model,
      isActive: body.isActive ?? existing?.isActive ?? false,
    }
    const row = await prisma.aiProvider.upsert({
      where: { userId_provider: { userId: uid, provider: body.provider } },
      update: data,
      create: { userId: uid, ...data },
    })
    return ok({ id: row.id, apiKeyMasked: maskApiKey(body.apiKey || decrypt(existing?.apiKeyEnc || '')) })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { id, isActive } = await req.json()
    if (isActive) {
      await prisma.aiProvider.updateMany({ where: { userId: uid }, data: { isActive: false } })
    }
    await prisma.aiProvider.update({ where: { id, userId: uid }, data: { isActive } })
    return ok({ updated: true })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { id } = await req.json()
    await prisma.aiProvider.deleteMany({ where: { id, userId: uid } })
    return ok({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
