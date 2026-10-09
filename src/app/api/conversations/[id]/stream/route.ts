import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { fail, sseHeaders } from '@/lib/api'
import { runAgent } from '@/lib/agent'
import { chatStream, getUserActiveProvider, getSystemFallback } from '@/lib/ai-gateway'
import { logger } from '@/lib/logger'

function safeJson(s: string | null | undefined): Record<string, unknown> | undefined {
  if (!s) return undefined
  try { return JSON.parse(s) } catch { return undefined }
}

/**
 * AI 单聊流式接口：SSE 输出
 * 事件：node（思考链节点）、token、memories、emotion、done、error
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await requireUser()
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: uid } },
  })
  if (!member) return fail('无权限', 403)

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { members: true },
  })
  if (!conv || conv.type !== 'ai') return fail('仅 AI 会话支持流式', 400)

  const { content, history = [], withRag = true } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        const profile = await prisma.profile.findUnique({ where: { userId: uid } })

        const agent = await runAgent(
          { userId: uid, input: content, history, profile: profile ? { displayName: profile.displayName, persona: safeJson(profile.persona) } : null, withRag },
          (node) => send({ type: 'node', node }),
        )

        send({ type: 'emotion', data: agent.emotion })
        send({ type: 'memories', data: agent.memories })

        if (agent.risk.humanReviewRequired) {
          send({ type: 'risk', data: agent.risk })
          send({ type: 'token', data: '这条消息触发了安全策略，已进入人工复核流程。我先给你一个谨慎的回应：' })
        }

        let provider = await getUserActiveProvider(uid)
        let usedFallback = false
        if (!provider?.apiKey) {
          provider = getSystemFallback()
          usedFallback = true
        }

        const messages = [
          { role: 'system' as const, content: agent.responsePrompt },
          ...history.slice(-10),
          { role: 'user' as const, content },
        ]

        try {
          const aiStream = await chatStream(provider, messages, { temperature: 0.8, maxTokens: 1500 })
          const reader = aiStream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (e) {
          if (!usedFallback) {
            // 用户接口失败 → 自动切换系统默认
            logger.warn('user provider failed, fallback', (e as Error).message)
            send({ type: 'info', data: '你的 AI 接口连接失败，已切换到系统默认模型' })
            const fallback = getSystemFallback()
            const aiStream = await chatStream(fallback, messages, { temperature: 0.8 })
            const reader = aiStream.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
          } else {
            send({ type: 'token', data: '\n\n（模型暂时不可用，请稍后重试）' })
            send({ type: 'done' })
            controller.close()
            return
          }
        }

        // 异步写入情绪记录
        prisma.emotion
          .create({ data: { userId: uid, ...agent.emotion, source: 'text' } })
          .catch(() => {})

        send({ type: 'done' })
        controller.close()
      } catch (e) {
        logger.error('stream error', (e as Error).message)
        send({ type: 'error', data: (e as Error).message })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: sseHeaders() })
}
