import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'
import { retrieveMemories, rewriteQuery } from '@/lib/rag'

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const q = req.nextUrl.searchParams.get('q')
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50)
    const type = req.nextUrl.searchParams.get('type')

    if (q) {
      const rewritten = await rewriteQuery(q, uid)
      const results = await retrieveMemories({
        query: rewritten,
        userId: uid,
        topK: limit,
        types: type ? [type] : undefined,
      })
      return ok({ query: rewritten, results })
    }
    const rows = await prisma.memory.findMany({
      where: { userId: uid, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return ok(rows)
  } catch (e) {
    return handleApiError(e)
  }
}

const createSchema = z.object({
  content: z.string().min(1),
  type: z.string().default('note'),
  topic: z.string().optional(),
  emotion: z.string().optional(),
  intensity: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const body = createSchema.parse(await req.json())
    const row = await prisma.memory.create({ data: { userId: uid, ...body } })
    return ok(row)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { id } = await req.json()
    await prisma.memory.deleteMany({ where: { id, userId: uid } })
    return ok({ deleted: true })
  } catch (e) {
    return handleApiError(e)
  }
}
