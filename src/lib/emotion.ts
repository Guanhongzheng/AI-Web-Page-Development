import type { EmotionLabel } from './types'

const KEYWORDS: Record<Exclude<EmotionLabel, 'neutral'>, string[]> = {
  happy: ['开心', '高兴', '快乐', '哈哈', '棒', '太好了', '喜欢', '爱', '成功', '赢', 'happy', 'joy'],
  sad: ['难过', '伤心', '累', '疲惫', '哭', '失落', '孤独', '抑郁', 'emo', 'sad', 'tired', '没意思'],
  anxious: ['焦虑', '担心', '紧张', '害怕', '压力', '慌', '不安', 'anxious', 'worry', '考试', '面试'],
  angry: ['生气', '愤怒', '烦', '讨厌', '气死', '火大', 'angry', 'mad', '无语'],
  calm: ['平静', '放松', '舒服', '安心', 'calm', 'relax', '冥想', '瑜伽'],
  excited: ['兴奋', '激动', '期待', '超棒', '哇', '爽', 'excited', 'awesome', '太棒了'],
}

export function analyzeEmotionText(text: string): { label: EmotionLabel; intensity: number; confidence: number } {
  const t = text.toLowerCase()
  const scores: Record<string, number> = {}
  for (const [label, words] of Object.entries(KEYWORDS)) {
    let s = 0
    for (const w of words) {
      const idx = t.indexOf(w)
      if (idx >= 0) s += 2
    }
    // 表情符号
    if (/[😀😊🥰😄😁🎉✨]/.test(text) && label === 'happy') s += 3
    if (/[😢😭😔😞💔]/.test(text) && label === 'sad') s += 3
    if (/[😰😨😱😟]/.test(text) && label === 'anxious') s += 3
    if (/[😡🤬😠💢]/.test(text) && label === 'angry') s += 3
    if (/[😌🧘☕🌿]/.test(text) && label === 'calm') s += 3
    if (/[🤩🎉🔥🥳]/.test(text) && label === 'excited') s += 3
    scores[label] = s
  }
  let best: EmotionLabel = 'neutral'
  let bestScore = 0
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestScore) {
      bestScore = v
      best = k as EmotionLabel
    }
  }
  if (bestScore === 0) return { label: 'neutral', intensity: 20, confidence: 0.5 }
  const intensity = Math.min(100, 30 + bestScore * 15)
  const confidence = Math.min(0.95, 0.6 + bestScore * 0.08)
  return { label: best, intensity, confidence }
}

export const EMOTION_PALETTE: Record<EmotionLabel, string> = {
  happy: '暖色光晕',
  sad: '深蓝雨滴',
  anxious: '星空粒子',
  angry: '暗红岩熔',
  calm: '森林渐变',
  excited: '音乐响应网格',
  neutral: '极光渐变',
}
