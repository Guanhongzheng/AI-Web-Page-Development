import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'
import { chatCompletion, getUserActiveProvider, getSystemFallback } from '@/lib/ai-gateway'
import { analyzeEmotionText } from '@/lib/emotion'
import { logMcpCall } from '@/lib/mcp-logger'

const createSchema = z.object({
  type: z.enum(['poem', 'story', 'note', 'song']),
  prompt: z.string().min(1),
  style: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const uid = await requireUser()
    const rows = await prisma.creation.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 50 })
    return ok(rows)
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const uid = await requireUser()
    const body = createSchema.parse(await req.json())
    const emotion = analyzeEmotionText(body.prompt)

    const system =
      body.type === 'poem'
        ? '你是一位诗人。根据用户的主题和情绪，写一首中文现代诗，有意境，不超过 12 行。'
        : body.type === 'story'
          ? '你是一位故事创作者。根据用户给的开头或主题，写一个 300-500 字的温暖小故事。'
          : body.type === 'song'
            ? '你是一位作词人。根据主题写一段歌词，分主歌和副歌。'
            : '根据用户的想法，扩展成一篇流畅的短文。'

    let provider = await getUserActiveProvider(uid)
    if (!provider?.apiKey) provider = getSystemFallback()
    let content: string
    try {
      content = await chatCompletion(provider, [
        { role: 'system', content: `${system}\n当前情绪：${emotion.label}（强度${emotion.intensity}），请让作品贴合这种情绪。` },
        { role: 'user', content: body.prompt },
      ], { temperature: 0.9 })
    } catch {
      content = '（模型暂时不可用，这是示例创作）\n当星光落入你的窗口，\n我把想念折成纸船，\n放进时间的河流里，\n等它漂到你身边。'
    }

    const row = await prisma.creation.create({
      data: { userId: uid, type: body.type, title: body.prompt.slice(0, 20), content, emotion: emotion.label },
    })
    await prisma.memory.create({ data: { userId: uid, content: `创作了${body.type}：${body.prompt}`, type: 'creation', emotion: emotion.label } }).catch(() => {})
    await logMcpCall(uid, 'generate_creative', body, { id: row.id }, Date.now() - start)
    return ok(row)
  } catch (e) {
    return handleApiError(e)
  }
}
