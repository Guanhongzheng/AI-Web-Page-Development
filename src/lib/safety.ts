import type { RiskResult } from './types'

const SENSITIVE_WORDS = ['暴力', '自杀', '自残', '毒品', '赌博', '色情', '诈骗', '洗钱']

const PII_PATTERNS: { type: string; regex: RegExp }[] = [
  { type: 'phone', regex: /1[3-9]\d{9}/g },
  { type: 'email', regex: /[\w.-]+@[\w.-]+\.\w+/g },
  { type: 'id_card', regex: /\d{17}[\dXx]/g },
  { type: 'bank_card', regex: /\d{16,19}/g },
  { type: 'url', regex: /https?:\/\/[^\s]+/g },
]

export function detectPII(text: string) {
  const items: { type: string; strategy: 'redact' | 'mask' | 'hash' | 'block'; value: string }[] = []
  for (const p of PII_PATTERNS) {
    const matches = text.match(p.regex)
    if (matches) {
      for (const m of matches) {
        items.push({
          type: p.type,
          strategy: p.type === 'url' ? 'mask' : p.type === 'bank_card' || p.type === 'id_card' ? 'hash' : 'mask',
          value: m,
        })
      }
    }
  }
  return items
}

export function maskText(text: string): string {
  let out = text
  out = out.replace(/1[3-9]\d{9}/g, (m) => m.slice(0, 3) + '****' + m.slice(-4))
  out = out.replace(/[\w.-]+@[\w.-]+\.\w+/g, (m) => {
    const [name, domain] = m.split('@')
    return `${name?.slice(0, 2)}***@${domain}`
  })
  out = out.replace(/\d{17}[\dXx]/g, (m) => m.slice(0, 4) + '**********' + m.slice(-4))
  out = out.replace(/\d{16,19}/g, (m) => m.slice(0, 4) + ' **** **** ' + m.slice(-4))
  return out
}

export function assessRisk(text: string): RiskResult {
  const categories: string[] = []
  const evidence: string[] = []
  let score = 0

  for (const w of SENSITIVE_WORDS) {
    if (text.includes(w)) {
      categories.push('敏感内容')
      evidence.push(`命中敏感词：${w}`)
      score += 30
    }
  }
  const pii = detectPII(text)
  if (pii.length) {
    categories.push('隐私信息')
    evidence.push(`检测到 ${pii.length} 项 PII：${pii.map((p) => p.type).join('、')}`)
    score += pii.length * 10
  }
  if (/帮我.*(?:写|做|生成).*(?:代码|程序).*(?:攻击|入侵|破解)/.test(text)) {
    categories.push('安全风险')
    evidence.push('疑似恶意请求')
    score += 50
  }

  score = Math.min(100, score)
  const level: RiskResult['level'] =
    score >= 80 ? 'critical' : score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low'

  return {
    level,
    score,
    categories: [...new Set(categories)],
    evidence,
    piiItems: pii,
    humanReviewRequired: level === 'high' || level === 'critical',
  }
}

export function inputGuardrail(text: string): { blocked: boolean; risk: RiskResult; sanitized: string } {
  const risk = assessRisk(text)
  const sanitized = maskText(text)
  return { blocked: risk.humanReviewRequired, risk, sanitized }
}
