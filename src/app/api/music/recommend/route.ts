import { NextRequest } from 'next/server'
import { ok, handleApiError } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { logMcpCall } from '@/lib/mcp-logger'
import { searchSongs, enrichWithUrl } from '@/lib/netease'
import type { EmotionLabel } from '@/lib/types'

const MOOD_MUSIC: Record<EmotionLabel, { genres: string[]; tempo: string; keywords: string[]; reason: string }> = {
  happy: { genres: ['流行', '民谣'], tempo: '中快', keywords: ['阳光 轻快', '治愈 温暖'], reason: '开心时适合明亮轻快的旋律，放大愉悦感' },
  sad: { genres: ['钢琴', '纯音乐'], tempo: '慢', keywords: ['钢琴曲 安静', '夜的钢琴曲'], reason: '难过时用轻柔钢琴陪伴，不加重情绪' },
  anxious: { genres: ['白噪音', '环境音'], tempo: '极慢', keywords: ['雨声 白噪音', '森林 冥想'], reason: '焦虑时白噪音能降低心率，回归平静' },
  angry: { genres: ['古典', '爵士'], tempo: '中', keywords: ['舒缓 古典', '平和 爵士'], reason: '平缓古典帮助平复激动情绪' },
  calm: { genres: ['Lo-fi', '氛围'], tempo: '中慢', keywords: ['lofi chill', '午后 咖啡'], reason: '平静时 Lo-fi 最适合保持专注放松' },
  excited: { genres: ['电子', '摇滚'], tempo: '快', keywords: ['电子 燃', '摇滚 节奏'], reason: '兴奋时电子乐释放能量' },
  neutral: { genres: ['流行', '轻音乐'], tempo: '中', keywords: ['流行 热歌', '轻音乐'], reason: '日常状态下的百搭选择' },
}

export async function GET(req: NextRequest) {
  const start = Date.now()
  try {
    await requireUser()
    const url = new URL(req.url)
    const mood = (url.searchParams.get('mood') as EmotionLabel) || 'neutral'
    const strategy = MOOD_MUSIC[mood] ?? MOOD_MUSIC.neutral

    // 全部走网易云：按情绪关键词搜索并补齐可播放地址
    let tracks: any[] = []
    for (const kw of strategy.keywords) {
      try {
        const found = await searchSongs(kw, 15)
        if (found.length) { tracks = found; break }
      } catch { /* 试下一个关键词 */ }
    }
    const withUrl = await enrichWithUrl(tracks)
    const playable = withUrl.filter((t) => t.url)

    const playlist_name = `${mood === 'happy' ? '开心' : mood === 'sad' ? '治愈' : mood === 'anxious' ? '放松' : mood === 'excited' ? '燃动' : '平静'}时刻 · AI 推荐`
    const result = {
      mood,
      genres: strategy.genres,
      tempo: strategy.tempo,
      keywords: strategy.keywords,
      playlist_name,
      reason: strategy.reason,
      transition: `从当前歌单平滑过渡到「${playlist_name}」，2 秒淡入淡出`,
      source: 'netease',
      tracks: playable,
    }
    await logMcpCall(null, 'recommend_by_emotion', { mood }, { ...result, tracks: playable.length }, Date.now() - start)
    return ok(result)
  } catch (e) {
    return handleApiError(e)
  }
}
