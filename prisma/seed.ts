import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // AI 伴侣虚拟用户
  await prisma.user.upsert({
    where: { id: 'ai-companion' },
    update: {},
    create: { id: 'ai-companion', username: 'PersonaMate', email: 'ai@personamate.local', passwordHash: 'x' },
  })

  // 演示账号 demo / demo123
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync('demo123', salt, 100000, 64, 'sha256').toString('hex')
  const demo = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@personamate.local',
      passwordHash: `${salt}:${hash}`,
      profile: { create: { displayName: '演示用户', persona: JSON.stringify({ interests: ['音乐', '电影', '旅行'], style: 'friendly' }) } },
      uiPreferences: { create: {} },
      themes: { create: { mode: 'system' } },
      music: { create: {} },
    },
  })

  // 示例记忆
  await prisma.memory.createMany({
    data: [
      { userId: demo.id, content: '我最近在学习 TypeScript，感觉类型系统很强大', type: 'chat', emotion: 'happy', intensity: 60 },
      { userId: demo.id, content: '我喜欢下雨天听钢琴音乐，能让我平静下来', type: 'preference', emotion: 'calm', intensity: 70 },
      { userId: demo.id, content: '上周和朋友去看了演唱会，特别兴奋', type: 'chat', emotion: 'excited', intensity: 85 },
      { userId: demo.id, content: '我养了一只橘猫叫年糕', type: 'note', emotion: 'happy', intensity: 75 },
      { userId: demo.id, content: '工作压力有点大，最近经常感到焦虑', type: 'chat', emotion: 'anxious', intensity: 65 },
    ],
  })

  // 示例情绪记录
  const now = Date.now()
  await prisma.emotion.createMany({
    data: Array.from({ length: 14 }, (_, i) => ({
      userId: demo.id,
      label: (['happy', 'calm', 'neutral', 'sad', 'excited', 'anxious'] as const)[i % 6] as string,
      intensity: 30 + Math.floor(Math.random() * 50),
      confidence: 0.7 + Math.random() * 0.25,
      source: 'text',
      createdAt: new Date(now - (13 - i) * 86400000),
    })),
  })

  console.log('Seed 完成：demo / demo123')
}

main().finally(() => prisma.$disconnect())
