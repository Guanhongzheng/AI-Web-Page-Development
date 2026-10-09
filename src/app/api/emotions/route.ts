import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

const createSchema = z.object({
  label: z.enum(['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'neutral']),
  intensity: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1).default(0.8),
  source: z.string().default('text'),
  meta: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50)
    const rows = await prisma.emotion.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return ok(rows)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const body = createSchema.parse(await req.json())
    const row = await prisma.emotion.create({ data: { userId: uid, label: body.label, intensity: body.intensity, confidence: body.confidence, source: body.source, meta: body.meta ? JSON.stringify(body.meta) : null } })
    return ok(row)
  } catch (e) {
    return handleApiError(e)
  }
}
