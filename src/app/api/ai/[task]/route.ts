import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ok, fail, handleApiError } from '@/lib/api'
import { chatCompletion, getUserActiveProvider, getSystemFallback } from '@/lib/ai-gateway'
import { analyzeEmotionText } from '@/lib/emotion'
import { logMcpCall } from '@/lib/mcp-logger'
import { prisma } from '@/lib/db'

async function aiCall(uid: string, system: string, user: string, opts?: { temperature?: number }) {
  let provider = await getUserActiveProvider(uid)
  if (!provider?.apiKey) provider = getSystemFallback()
  try {
    return await chatCompletion(provider, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], opts)
  } catch {
    const fb = getSystemFallback()
    return chatCompletion(fb, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], opts)
  }
}

const SYSTEMS: Record<string, string> = {
  summarize: '你是对话总结助手。用中文输出 3-5 条要点，每条不超过 30 字，覆盖关键信息、决策和待办。只输出要点，用换行分隔。',
  translate: '你是专业翻译。把用户内容翻译成中文（如果已是中文则翻译成英文），只输出译文，保持语气。',
  polish: '你是文字润色助手。在保持原意的前提下优化表达，更流畅自然。只输出润色后的文本。',
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const uid = await requireUser()
    const url = req.nextUrl.pathname.split('/').pop() ?? ''
    const { content, targetLang } = await req.json()
    if (!content?.trim()) return fail('内容为空', 400)

    let system = SYSTEMS[url]
    let userPrompt = content

    if (url === 'translate') {
      system = targetLang
        ? `把下面的内容翻译成${targetLang}，只输出译文。`
        : SYSTEMS.translate
    }

    let result: unknown
    if (url === 'recommend-bgm') {
      const emo = analyzeEmotionText(content)
      const map: Record<string, string> = {
        happy: '推荐：《晴天》- 周杰伦 / 《小幸运》- 田馥甄，明快治愈',
        sad: '推荐：《夜的钢琴曲五》- 石进 / Experience - Ludovico Einaudi，轻柔陪伴',
        anxious: '推荐：雨声白噪音 / 森林晨曦，帮你平复',
        calm: '推荐：Lo-fi Beats / 午后阳光，保持放松',
        excited: '推荐：Faded - Alan Walker / Alone - Marshmello，释放能量',
        angry: '推荐：舒缓古典 / 爵士，平复心情',
        neutral: '推荐：《起风了》- 买辣椒也用券 / 日常轻音乐',
      }
      result = `检测到情绪「${emo.label}」（强度${emo.intensity}）。${map[emo.label]}`
    } else if (url === 'suggest-reply') {
      result = await aiCall(
        uid,
        '你是社交建议助手。根据对方的消息，给出 3 条不同风格的中文回复建议（温暖/幽默/简洁各一条）。输出 JSON 数组，每项 {style, text}。',
        content,
        { temperature: 0.9 },
      )
      try {
        const json = JSON.parse(result as string)
        result = Array.isArray(json) ? json : [{ style: '建议', text: result }]
      } catch {
        result = [{ style: '建议', text: result }]
      }
    } else if (url === 'emotion') {
      result = analyzeEmotionText(content)
    } else {
      result = await aiCall(uid, system!, userPrompt)
    }

    await logMcpCall(uid, url === 'suggest-reply' ? 'suggest_reply' : url === 'emotion' ? 'analyze_emotion' : url, { content }, result, Date.now() - start)
    // 群聊总结写成长记录
    if (url === 'summarize') {
      prisma.growthRecord.create({ data: { userId: uid, type: 'reflection', content: `对话总结：${String(result).slice(0, 200)}` } }).catch(() => {})
    }
    return ok(result)
  } catch (e) {
    return handleApiError(e)
  }
}

export const runtime = 'nodejs'
