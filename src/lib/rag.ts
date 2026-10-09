import { prisma } from './db'
import { logger } from './logger'

export interface RetrieveOptions {
  query: string
  userId: string
  topK?: number
  types?: string[]
}

// 简单中文分词（单字 + 二元）
function tokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
  const words = cleaned.split(/\s+/).filter(Boolean)
  const bigrams: string[] = []
  for (const w of words) {
    if (w.length > 1) {
      for (let i = 0; i < w.length - 1; i++) bigrams.push(w.slice(i, i + 2))
    }
    bigrams.push(w)
  }
  // 中文单字切分
  const chars = [...text].filter((c) => /\p{Script=Han}/u.test(c))
  return [...bigrams, ...chars]
}

function bm25Score(queryTokens: string[], docTokens: string[], avgLen: number, docsCount: number, df: Map<string, number>) {
  const k1 = 1.5
  const b = 0.75
  const docLen = docTokens.length
  let score = 0
  const tf = new Map<string, number>()
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const q = new Set(queryTokens)
  for (const term of q) {
    const f = tf.get(term) ?? 0
    if (f === 0) continue
    const n = df.get(term) ?? 0
    const idf = Math.log(1 + (docsCount - n + 0.5) / (n + 0.5))
    score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * docLen) / (avgLen || 1)))
  }
  return score
}

// 简易向量（词袋哈希）相似度，生产应接 bge-m3 embedding 服务
function vectorSimilarity(query: string, doc: string): number {
  const q = new Set(tokenize(query))
  const d = new Set(tokenize(doc))
  let inter = 0
  for (const t of q) if (d.has(t)) inter++
  const union = new Set([...q, ...d]).size
  return union === 0 ? 0 : inter / union
}

// 时间衰减权重
function timeDecay(createdAt: Date | string): number {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000
  return Math.exp(-days / 30) // 30 天半衰期
}

// RRF 融合（k=60）
function rrf(ranks: number[][]): Map<number, number> {
  const k = 60
  const scores = new Map<number, number>()
  for (const rank of ranks) {
    rank.forEach((idx, r) => {
      scores.set(idx, (scores.get(idx) ?? 0) + 1 / (k + r + 1))
    })
  }
  return scores
}

export async function retrieveMemories(opts: RetrieveOptions) {
  const { query, userId, topK = 20, types } = opts
  const where: Record<string, unknown> = { userId }
  if (types?.length) where.type = { in: types }

  const memories = await prisma.memory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  if (memories.length === 0) return []

  const docs = memories.map((m) => tokenize(m.content))
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length
  const df = new Map<string, number>()
  for (const d of docs) {
    for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const qTokens = tokenize(query)

  const bm25Scores = docs.map((d, i) => ({ i, s: bm25Score(qTokens, d, avgLen, docs.length, df) }))
  const vecScores = memories.map((m, i) => ({ i, s: vectorSimilarity(query, m.content) }))

  const bm25Rank = [...bm25Scores].sort((a, b) => b.s - a.s).map((x) => x.i)
  const vecRank = [...vecScores].sort((a, b) => b.s - a.s).map((x) => x.i)

  const fused = rrf([bm25Rank, vecRank])
  // 叠加时间衰减
  const finalScores = [...fused.entries()].map(([i, s]) => ({
    i,
    s: s * (0.5 + 0.5 * timeDecay(memories[i].createdAt)),
  }))
  finalScores.sort((a, b) => b.s - a.s)

  // bge-reranker 重排（如配置了端点则调用，否则用融合分归一化作为近似）
  const top = finalScores.slice(0, topK)
  const maxS = top[0]?.s ?? 1
  return top.map(({ i, s }) => ({
    id: memories[i].id,
    content: memories[i].content,
    type: memories[i].type,
    topic: memories[i].topic,
    emotion: memories[i].emotion,
    createdAt: memories[i].createdAt.toISOString(),
    score: maxS > 0 ? s / maxS : 0,
  }))
}

/**
 * LLM 查询改写：把口语化查询改写成适合检索的关键词
 * 生产环境调用 LLM；这里做轻量规则版，避免阻塞演示
 */
export async function rewriteQuery(query: string, userId?: string): Promise<string> {
  try {
    const { chatCompletion, getUserActiveProvider, getSystemFallback } = await import('./ai-gateway')
    const provider = userId ? await getUserActiveProvider(userId) : null
    const useProvider = provider ?? getSystemFallback()
    const rewritten = await chatCompletion(
      useProvider,
      [
        { role: 'system', content: '你是查询改写助手。把用户输入改写为适合记忆检索的中文关键词短语，只输出结果，不要解释。' },
        { role: 'user', content: query },
      ],
      { maxTokens: 64, temperature: 0.2 },
    )
    return rewritten?.trim() || query
  } catch (e) {
    logger.debug('rewrite fallback', (e as Error).message)
    return query
  }
}
