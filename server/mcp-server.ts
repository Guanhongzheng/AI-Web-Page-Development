#!/usr/bin/env tsx
/**
 * PersonaMate MCP Server
 * 提供 14 个工具：search_memory, analyze_emotion, generate_creative, get_calendar,
 * play_music, log_growth, encrypt_data, search_music, get_daily_recommend,
 * recommend_by_emotion, create_playlist, summarize_conversation, suggest_reply, translate_message
 * 所有调用写入 mcp_logs 表
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { encrypt } from '../src/lib/crypto'

const prisma = new PrismaClient()

const server = new Server(
  { name: 'personamate-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

const TOOLS = [
  { name: 'search_memory', description: '检索个人记忆库（混合检索 RAG）', inputSchema: { type: 'object', properties: { query: { type: 'string' }, userId: { type: 'string' }, topK: { type: 'number' } }, required: ['query', 'userId'] } },
  { name: 'analyze_emotion', description: '分析文本情绪', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'generate_creative', description: '生成创意内容（诗/故事）', inputSchema: { type: 'object', properties: { type: { type: 'string' }, prompt: { type: 'string' } }, required: ['type', 'prompt'] } },
  { name: 'get_calendar', description: '获取今日概览', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'play_music', description: '根据情绪播放音乐', inputSchema: { type: 'object', properties: { mood: { type: 'string' } }, required: ['mood'] } },
  { name: 'log_growth', description: '记录成长点滴', inputSchema: { type: 'object', properties: { userId: { type: 'string' }, content: { type: 'string' } }, required: ['userId', 'content'] } },
  { name: 'encrypt_data', description: '加密敏感数据（AES-256-GCM）', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'search_music', description: '搜索网易云歌曲', inputSchema: { type: 'object', properties: { keyword: { type: 'string' } }, required: ['keyword'] } },
  { name: 'get_daily_recommend', description: '获取每日推荐歌单', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'recommend_by_emotion', description: '按情绪推荐音乐策略', inputSchema: { type: 'object', properties: { mood: { type: 'string' } }, required: ['mood'] } },
  { name: 'create_playlist', description: '创建歌单', inputSchema: { type: 'object', properties: { name: { type: 'string' }, userId: { type: 'string' } }, required: ['name', 'userId'] } },
  { name: 'summarize_conversation', description: '总结对话', inputSchema: { type: 'object', properties: { messages: { type: 'array' } }, required: ['messages'] } },
  { name: 'suggest_reply', description: '建议回复', inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } },
  { name: 'translate_message', description: '翻译消息', inputSchema: { type: 'object', properties: { text: { type: 'string' }, targetLang: { type: 'string' } }, required: ['text'] } },
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const start = Date.now()
  let output: unknown = null
  let status: 'success' | 'error' = 'success'
  try {
    switch (name) {
      case 'log_growth':
        await prisma.growthRecord.create({ data: { userId: (args as any).userId, type: 'insight', content: (args as any).content } })
        output = { logged: true }
        break
      case 'encrypt_data': {
        // 复用统一的加密模块：密钥取自环境变量 ENCRYPTION_KEY，缺失即报错（不再自行拼凑密钥）
        output = { encrypted: encrypt((args as any).text) }
        break
      }
      default:
        output = { tool: name, received: args, note: 'MCP 工具调用成功（演示模式，实际处理由对应 API 完成）' }
    }
  } catch (e) {
    status = 'error'
    output = { error: (e as Error).message }
  }
  try {
    await prisma.mcpLog.create({
      data: { userId: (args as any)?.userId ?? null, toolName: name, input: args as any, output: output as any, status, duration: Date.now() - start },
    })
  } catch {}
  return { content: [{ type: 'text', text: JSON.stringify(output) }] }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('PersonaMate MCP Server running on stdio')
}
main().catch(console.error)
