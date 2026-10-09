import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, handleApiError } from '@/lib/api'

const TOOL_META = [
  { name: 'search_memory', desc: '检索个人记忆库（混合检索 RAG）' },
  { name: 'analyze_emotion', desc: '分析文本情绪' },
  { name: 'generate_creative', desc: '生成创意内容' },
  { name: 'get_calendar', desc: '获取今日概览' },
  { name: 'play_music', desc: '按情绪播放音乐' },
  { name: 'log_growth', desc: '记录成长点滴' },
  { name: 'encrypt_data', desc: 'AES-256-GCM 加密' },
  { name: 'search_music', desc: '搜索网易云歌曲' },
  { name: 'get_daily_recommend', desc: '每日推荐' },
  { name: 'recommend_by_emotion', desc: '情绪音乐推荐策略' },
  { name: 'create_playlist', desc: '创建歌单' },
  { name: 'summarize_conversation', desc: '对话总结' },
  { name: 'suggest_reply', desc: '建议回复' },
  { name: 'translate_message', desc: '翻译消息' },
]

export async function GET() {
  try {
    const uid = await requireUser()
    const logs = await prisma.mcpLog.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return ok({ tools: TOOL_META, logs })
  } catch (e) {
    return handleApiError(e)
  }
}
