// 全局类型定义

export type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'calm'
  | 'excited'
  | 'neutral'

export interface EmotionState {
  label: EmotionLabel
  intensity: number // 0-100
  confidence: number // 0-1
}

export type ConversationType = 'ai' | 'user' | 'group'

export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  avatar: string | null
  updatedAt: string
  lastMessage?: string
  unread?: number
  online?: boolean
  members?: { userId: string; isAi: boolean }[]
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  content: string
  type: 'text' | 'image' | 'audio' | 'system'
  emotion?: string | null
  isAigc?: boolean
  createdAt: string
  isMe?: boolean
  isAi?: boolean
}

export interface AiProviderConfig {
  id?: string
  provider:
    | 'openai'
    | 'deepseek'
    | 'qwen'
    | 'glm'
    | 'moonshot'
    | 'anthropic'
    | 'gemini'
    | 'ollama'
    | 'custom'
  name?: string
  baseUrl: string
  apiKey: string
  model: string
  isActive?: boolean
  isDefault?: boolean
}

export interface AgentNodeState {
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  duration?: number
  detail?: string
}

export interface AgentTimeline {
  nodes: AgentNodeState[]
  current: number
}

export interface MemoryItem {
  id: string
  content: string
  type: string
  topic?: string | null
  emotion?: string | null
  createdAt: string
  score?: number
  source?: string
}

export interface McpCallLog {
  id: string
  toolName: string
  input: unknown
  output?: unknown
  status: 'success' | 'error'
  duration?: number
  createdAt: string
}

export type WallpaperType = 'gradient' | 'particles' | 'music' | 'image'

export interface WallpaperConfig {
  type: WallpaperType
  emotion?: EmotionLabel
  colors?: string[]
  preset?: string
}

export interface MusicTrack {
  id: string
  name: string
  artist: string
  url?: string
  cover?: string
  duration?: number
}

export interface RiskResult {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100
  categories: string[]
  evidence: string[]
  piiItems?: { type: string; strategy: 'redact' | 'mask' | 'hash' | 'block' }[]
  humanReviewRequired: boolean
}
