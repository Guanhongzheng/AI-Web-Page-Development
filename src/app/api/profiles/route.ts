import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'

export async function GET() {
  try {
    const uid = await requireUser()
    const profile = await prisma.profile.findUnique({ where: { userId: uid } })
    return ok(profile)
  } catch (e) {
    return handleApiError(e)
  }
}

const patchSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().nullable().optional(),
  persona: z.record(z.unknown()).optional(),
  emotionProfile: z.record(z.unknown()).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const uid = await requireUser()
    const body = patchSchema.parse(await req.json())
    const profile = await prisma.profile.update({ where: { userId: uid }, data: body })
    return ok(profile)
  } catch (e) {
    return handleApiError(e)
  }
}
