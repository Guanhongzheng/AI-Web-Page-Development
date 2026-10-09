import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const days = Number(req.nextUrl.searchParams.get('days') ?? 30)
    const since = new Date(Date.now() - days * 86400000)
    const [emotions, growth, creations, memories] = await Promise.all([
      prisma.emotion.findMany({ where: { userId: uid, createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } }),
      prisma.growthRecord.findMany({ where: { userId: uid, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.creation.count({ where: { userId: uid, createdAt: { gte: since } } }),
      prisma.memory.count({ where: { userId: uid, createdAt: { gte: since } } }),
    ])
    // 按天聚合情绪
    const daily = new Map<string, { label: string; sum: number; count: number }>()
    const WEIGHT: Record<string, number> = { happy: 2, excited: 2, calm: 1, neutral: 0, anxious: -1, sad: -2, angry: -2 }
    for (const e of emotions) {
      const day = e.createdAt.toISOString().slice(0, 10)
      const cur = daily.get(day) ?? { label: e.label, sum: 0, count: 0 }
      cur.sum += (WEIGHT[e.label] ?? 0) * (e.intensity / 50)
      cur.count += 1
      daily.set(day, cur)
    }
    const series = [...daily.entries()].map(([date, v]) => ({ date, score: Math.round((v.sum / v.count) * 10) / 10 }))
    const avg = emotions.length ? Math.round(emotions.reduce((s, e) => s + e.intensity, 0) / emotions.length) : 0
    const topEmotion = emotions.sort((a, b) => b.intensity - a.intensity)[0]?.label ?? 'neutral'
    return ok({ series, stats: { emotionsCount: emotions.length, creations, memories, avgIntensity: avg, topEmotion }, growth })
  } catch (e) {
    return handleApiError(e)
  }
}
