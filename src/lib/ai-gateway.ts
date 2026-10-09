import axios, { AxiosError } from 'axios'
import type { AiProviderConfig } from './types'
import { decrypt } from './crypto'
import { prisma } from './db'
import { logger } from './logger'

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434/v1',
}

function normalizeBaseUrl(baseUrl: string | undefined | null, provider?: string): string {
  let url = (baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!url && provider) url = DEFAULT_BASE_URLS[provider] ?? ''
  if (!url) throw new Error('Base URL 不能为空，请在设置中填写服务商地址')
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return url
}

interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error' | 'node'
  data?: string
  node?: { name: string; status: string; duration?: number; detail?: string }
}

const PROVIDER_DEFAULTS: Record<AiProviderConfig['provider'], { baseUrl: string; models: string[] }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
  deepseek: { baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-max', 'qwen-plus'] },
  glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  anthropic: { baseUrl: 'https://api.anthropic.com', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  ollama: { baseUrl: 'http://localhost:11434/v1', models: ['qwen2.5', 'llama3.1'] },
  custom: { baseUrl: '', models: [] },
}

export function getProviderDefaults(p: AiProviderConfig['provider']) {
  return PROVIDER_DEFAULTS[p]
}

export async function getUserActiveProvider(userId: string): Promise<AiProviderConfig | null> {
  const row = await prisma.aiProvider.findFirst({
    where: { userId, isActive: true },
  })
  if (!row) return getSystemFallback()
  return {
    id: row.id,
    provider: row.provider as AiProviderConfig['provider'],
    name: row.name ?? undefined,
    baseUrl: row.baseUrl,
    apiKey: decrypt(row.apiKeyEnc),
    model: row.model,
    isActive: row.isActive,
    isDefault: row.isDefault,
  }
}

export function getSystemFallback(): AiProviderConfig {
  return {
    provider: (process.env.DEFAULT_AI_PROVIDER as AiProviderConfig['provider']) || 'deepseek',
    baseUrl: process.env.DEFAULT_AI_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.DEFAULT_AI_API_KEY || '',
    model: process.env.DEFAULT_AI_MODEL || 'deepseek-chat',
    isDefault: true,
  }
}

/**
 * 统一聊天补全（非流式）
 */
export async function chatCompletion(
  provider: AiProviderConfig,
  messages: ChatMessageParam[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = opts
  const baseUrl = normalizeBaseUrl(provider.baseUrl, provider.provider)
  try {
    if (provider.provider === 'anthropic') {
      const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      const rest = messages.filter((m) => m.role !== 'system')
      const res = await axios.post(
        `${baseUrl.replace(/\/v1$/, '')}/v1/messages`,
        {
          model: provider.model,
          max_tokens: maxTokens,
          temperature,
          system: sys || undefined,
          messages: rest,
        },
        {
          headers: {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          signal: opts.signal,
          timeout: 60000,
        },
      )
      return res.data.content?.[0]?.text ?? ''
    }
    if (provider.provider === 'gemini') {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const sys = messages.find((m) => m.role === 'system')
      const url = `${baseUrl}/models/${provider.model}:generateContent?key=${provider.apiKey}`
      const res = await axios.post(
        url,
        {
          contents,
          systemInstruction: sys ? { parts: [{ text: sys.content }] } : undefined,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        },
        { signal: opts.signal, timeout: 60000 },
      )
      return res.data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    // OpenAI 兼容协议
    const res = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: provider.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'content-type': 'application/json',
        },
        signal: opts.signal,
        timeout: 60000,
      },
    )
    return res.data.choices?.[0]?.message?.content ?? ''
  } catch (e) {
    const err = e as AxiosError
    const data = err.response?.data as any
    const detail =
      data?.error?.message || data?.message || (typeof data === 'string' ? data : '') || JSON.stringify(data ?? {})
    logger.error('AI gateway error', provider.provider, err.response?.status, detail)
    throw new Error(`AI 调用失败 [${err.response?.status ?? err.code}]: ${detail || err.message}`)
  }
}

/**
 * 流式聊天补全，返回 ReadableStream（SSE）
 */
export async function chatStream(
  provider: AiProviderConfig,
  messages: ChatMessageParam[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<ReadableStream<Uint8Array>> {
  const { temperature = 0.7, maxTokens = 2048 } = opts
  const baseUrl = normalizeBaseUrl(provider.baseUrl, provider.provider)
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        if (provider.provider === 'gemini') {
          const contents = messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }))
          const url = `${baseUrl}/models/${provider.model}:streamGenerateContent?alt=sse&key=${provider.apiKey}`
          const res = await axios.post(url, { contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }, { responseType: 'stream' })
          res.data.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n')
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const json = JSON.parse(line.slice(6))
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) send({ type: 'token', data: text })
              } catch {}
            }
          })
          res.data.on('end', () => {
            send({ type: 'done' })
            controller.close()
          })
          return
        }

        const isAnthropic = provider.provider === 'anthropic'
        const url = isAnthropic
          ? `${baseUrl.replace(/\/v1$/, '')}/v1/messages`
          : `${baseUrl}/chat/completions`
        const body = isAnthropic
          ? {
              model: provider.model,
              max_tokens: maxTokens,
              temperature,
              stream: true,
              system: messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n') || undefined,
              messages: messages.filter((m) => m.role !== 'system'),
            }
          : { model: provider.model, messages, temperature, max_tokens: maxTokens, stream: true }
        const headers = isAnthropic
          ? { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01', accept: 'text/event-stream' }
          : { Authorization: `Bearer ${provider.apiKey}`, accept: 'text/event-stream' }

        const res = await axios.post(url, body, { headers, responseType: 'stream', timeout: 120000 })
        let buffer = ''
        res.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const l = line.trim()
            if (!l.startsWith('data: ')) continue
            const payload = l.slice(6)
            if (payload === '[DONE]') {
              send({ type: 'done' })
              controller.close()
              return
            }
            try {
              const json = JSON.parse(payload)
              if (isAnthropic) {
                if (json.type === 'content_block_delta' && json.delta?.text) {
                  send({ type: 'token', data: json.delta.text })
                }
                if (json.type === 'message_stop') {
                  send({ type: 'done' })
                  controller.close()
                }
              } else {
                const text = json.choices?.[0]?.delta?.content
                if (text) send({ type: 'token', data: text })
              }
            } catch {}
          }
        })
        res.data.on('end', () => {
          send({ type: 'done' })
          controller.close()
        })
        res.data.on('error', (err: Error) => {
          send({ type: 'error', data: err.message })
          controller.close()
        })
      } catch (e) {
        send({ type: 'error', data: (e as Error).message })
        controller.close()
      }
    },
  })
}

export async function testConnection(provider: AiProviderConfig): Promise<{ ok: boolean; latency: number; error?: string }> {
  const start = Date.now()
  try {
    await chatCompletion(provider, [{ role: 'user', content: 'ping' }], { maxTokens: 5 })
    return { ok: true, latency: Date.now() - start }
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: (e as Error).message }
  }
}
