import { prisma } from './db'
import { logger } from './logger'
import { analyzeEmotionText } from './emotion'
import { retrieveMemories, rewriteQuery } from './rag'
import { assessRisk, maskText } from './safety'
import type { AgentNodeState, EmotionLabel, MemoryItem } from './types'

export type AgentIntent = 'chat' | 'creative' | 'query' | 'help' | 'memory'

export interface AgentContext {
  userId: string
  input: string
  history: { role: string; content: string }[]
  profile?: { persona?: Record<string, unknown>; displayName?: string } | null
  withRag?: boolean
}

export interface AgentResult {
  nodes: AgentNodeState[]
  intent: AgentIntent
  emotion: { label: EmotionLabel; intensity: number; confidence: number }
  memories: MemoryItem[]
  risk: ReturnType<typeof assessRisk>
  responsePrompt: string // 交给 LLM 的最终 system+context
  citations: string[]
}

function elapsed(start: number) {
  return Date.now() - start
}

export async function runAgent(ctx: AgentContext, onNode?: (n: AgentNodeState) => void): Promise<AgentResult> {
  const nodes: AgentNodeState[] = []
  const push = (n: AgentNodeState) => {
    nodes.push(n)
    onNode?.(n)
  }

  // 1. 隐私检查（输入）
  const t0 = Date.now()
  push({ name: 'privacy', status: 'running', detail: '检查输入安全与 PII' })
  const risk = assessRisk(ctx.input)
  const sanitized = maskText(ctx.input)
  push({ name: 'privacy', status: 'done', duration: elapsed(t0), detail: `风险评分 ${risk.score}（${risk.level}）` })

  // 2. 情绪识别
  const t1 = Date.now()
  push({ name: 'emotion', status: 'running' })
  const emotion = analyzeEmotionText(ctx.input)
  push({ name: 'emotion', status: 'done', duration: elapsed(t1), detail: `${emotion.label} ${emotion.intensity}` })

  // 3. 意图识别
  const t2 = Date.now()
  push({ name: 'intent', status: 'running' })
  const intent = detectIntent(ctx.input)
  push({ name: 'intent', status: 'done', duration: elapsed(t2), detail: intent })

  // 4. 记忆检索（RAG）
  const t3 = Date.now()
  push({ name: 'memory', status: 'running', detail: '混合检索 + RRF + 重排' })
  let memories: MemoryItem[] = []
  if (ctx.withRag !== false) {
    try {
      const rewritten = await rewriteQuery(ctx.input, ctx.userId)
      memories = await retrieveMemories({ query: rewritten || ctx.input, userId: ctx.userId, topK: 5 })
    } catch (e) {
      logger.warn('rag error', (e as Error).message)
    }
  }
  push({
    name: 'memory',
    status: 'done',
    duration: elapsed(t3),
    detail: memories.length ? `命中 ${memories.length} 条记忆` : '无相关记忆',
  })

  // 5. 路由决策
  const t4 = Date.now()
  push({ name: 'route', status: 'running' })
  const routeNode =
    intent === 'creative' ? 'creative' : intent === 'help' ? 'growth' : intent === 'query' ? 'memory' : 'persona'
  push({ name: 'route', status: 'done', duration: elapsed(t4), detail: `→ ${routeNode}` })

  // 6. 构造个性化回应上下文（不在这里调 LLM，留给流式接口）
  const persona = (ctx.profile?.persona as { style?: string; interests?: string[] } | undefined) ?? {}
  const styleHint = persona.style === 'professional' ? '专业、条理清晰' : persona.style === 'playful' ? '俏皮、幽默' : persona.style === 'philosophical' ? '有深度、善用比喻' : '温暖、自然，像朋友'

  const memoryContext =
    memories.length > 0
      ? memories.map((m, i) => `[记忆${i + 1}] ${m.content}（${m.emotion ?? '无情绪标签'}，${daysAgo(m.createdAt)}）`).join('\n')
      : '（暂无相关记忆）'

  const citations = memories.map((m) => citationText(m))

  const careMode = emotion.intensity >= 70 && ['sad', 'anxious', 'angry'].includes(emotion.label)
  const lengthHint = emotion.intensity > 60 ? '适当多说一些，表达关心' : '简洁自然'

  const responsePrompt = [
    `你是 PersonaMate，用户「${ctx.profile?.displayName ?? '朋友'}」的个性化 AI 伴侣。`,
    `回复风格：${styleHint}。${lengthHint}。`,
    careMode ? `【关怀模式】检测到用户情绪${emotion.label}（强度${emotion.intensity}），请温和回应、给予情感支持，避免说教。` : `当前情绪：${emotion.label}。`,
    `\n【相关记忆（RAG 检索结果）】\n${memoryContext}`,
    memories.length ? '\n如果引用了记忆，请在句末用 [1][2] 标注对应编号。' : '',
    '\n请用中文回复，不要输出思考过程。',
  ].join('\n')

  // 7. 记忆写入（异步，不阻塞响应）
  prisma.memory
    .create({
      data: {
        userId: ctx.userId,
        content: sanitized,
        type: 'chat',
        emotion: emotion.label,
        intensity: emotion.intensity,
      },
    })
    .catch((e) => logger.warn('memory write error', e.message))
  push({ name: 'write_memory', status: 'done', duration: 0, detail: '已异步写入' })

  return { nodes, intent, emotion, memories, risk, responsePrompt, citations }
}

function detectIntent(text: string): AgentIntent {
  const t = text.toLowerCase()
  if (/(写|作|画|生成|创作|诗|故事|文章|谱曲|画图)/.test(text)) return 'creative'
  if (/(我该怎么办|帮帮我|建议|开导|鼓励)/.test(text)) return 'help'
  if (/(记得|回忆|上次|之前|那天|我们说过)/.test(text)) return 'memory'
  if (/(查|搜索|多少|是什么|为什么|怎么)/.test(text)) return 'query'
  return 'chat'
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return '今天'
  if (d === 1) return '昨天'
  if (d < 30) return `${d}天前`
  return `${Math.floor(d / 30)}个月前`
}

function citationText(m: MemoryItem): string {
  return `根据你${daysAgo(m.createdAt)}提到的「${m.content.slice(0, 30)}${m.content.length > 30 ? '…' : ''}」`
}
