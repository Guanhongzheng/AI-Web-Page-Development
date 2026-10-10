# PersonaMate AI · 技术升级方案（RAG / AI Agent / 多模态）

> 目标：对齐第九届传智杯 AI WEB 赛道官方考核点——**大模型 / AI Agent / RAG / 多模态 AI**，把「宣传四项、实测半项」变成「四项都真跑得起来」。
> 编写日期：2026-10-10｜距省赛 11/22 约 6 周

---

## 〇、现状盘点（代码实测）

| 模块 | 现状 | 落地度 |
|------|------|--------|
| 大模型 | `ai-gateway.ts` 9 服务商 / 三协议 / 流式 / 降级 | 90% ✅ |
| RAG | `rag.ts`：BM25 + RRF + 时间衰减为**真实实现**；"向量"= 词袋 Jaccard；"reranker"= 融合分归一化 | 55% |
| AI Agent | `agent.ts`：隐私→情绪→意图→RAG→路由→提示词→写记忆，**纯线性 pipeline**；意图靠正则；无工具调用；"人在回路"是假中断 | 40% |
| 多模态 | 仅 `ChatMessage.type` 声明了 `image/audio`；`Creation` 只有文本类；**全项目无 FormData / base64 / 文件上传代码**；`.env.example` 预留端点但无调用 | 10% |

**核心差距**：不是"没有功能"，而是**叙事与实现之间没有桥**。下面三节按「最小改动 → 最大收益」排序。

---

## 一、RAG 改造：从"BM25 单路"到"真混合检索 + 重排"

### 1.1 问题定位

1. **`vectorSimilarity()` 是词袋 Jaccard**，不是语义向量 → "我养了一只橘猫叫年糕" 检索不到 "家里的猫最近怎么样"，语义检索名存实亡。
2. **reranker 未接**，只是把融合分除以最大值，不是重排。
3. 每次检索 `findMany({ take: 200 })` 全量拉取 → 记忆多了是 O(n) 线性扫描。
4. 无 embedding 缓存，`rewriteQuery` 每次都真调一次 LLM（延迟 + 成本）。
5. 检索结果无 `messageId` 溯源，前端"引用"只能显示文本。

### 1.2 改造方案（三层，按性价比）

#### L1 接真 embedding ——【必做，约 1 天】

`.env.example` 已预留 `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL`，`Memory.embedding String?` 字段也已存在，**改动面极小**。

新建 `src/lib/embedding.ts`：

```ts
import axios from 'axios'
import { logger } from './logger'

const BASE = process.env.EMBEDDING_BASE_URL || ''
const MODEL = process.env.EMBEDDING_MODEL || 'bge-m3'
const KEY = process.env.EMBEDDING_API_KEY || ''

export const embeddingEnabled = () => !!BASE

/** 兼容 OpenAI /v1/embeddings 协议：bge-m3、text-embedding-3、通义、智谱均适用 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (!BASE || texts.length === 0) return []
  try {
    const res = await axios.post(
      `${BASE.replace(/\/+$/, '')}/v1/embeddings`,
      { model: MODEL, input: texts },
      { headers: KEY ? { Authorization: `Bearer ${KEY}` } : {}, timeout: 20000 },
    )
    return res.data.data.map((d: { embedding: number[] }) => d.embedding)
  } catch (e) {
    logger.warn('embedding failed, degrade to BM25', (e as Error).message)
    return []
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}
```

**写入侧**：在 `agent.ts` 写记忆处、`prisma/seed.ts`、以及 `/api/memories` POST 处，异步补 embedding：

```ts
prisma.memory.create({ data: { ...} })
  .then(async (m) => {
    const [v] = await embed([m.content])
    if (v) await prisma.memory.update({ where: { id: m.id }, data: { embedding: JSON.stringify(v) } })
  })
  .catch((e) => logger.warn('memory embed error', e.message))
```

**检索侧**：`rag.ts` 的第二路从 `vectorSimilarity` 换成余弦：

```ts
const hasEmb = embeddingEnabled()
let vecScores: { i: number; s: number }[]
if (hasEmb) {
  const [qv] = await embed([query])
  vecScores = memories.map((m, i) => {
    const mv = m.embedding ? (JSON.parse(m.embedding) as number[]) : null
    return { i, s: mv && qv ? cosine(qv, mv) : vectorSimilarity(query, m.content) } // 无向量的老数据兜底
  })
} else {
  vecScores = memories.map((m, i) => ({ i, s: vectorSimilarity(query, m.content) }))
}
```

> **关键点：全程优雅降级。** 评委环境没配 embedding 也照常跑 BM25，不会崩——这本身就是可讲的技术点（"检索层可插拔"）。

#### L2 接真 reranker ——【必做，约半天】

新建 `src/lib/rerank.ts`：

```ts
import axios from 'axios'

export async function rerank(query: string, docs: string[], topK = 5) {
  const base = process.env.RERANKER_BASE_URL
  if (!base) return null
  try {
    const res = await axios.post(
      `${base.replace(/\/+$/, '')}/v1/rerank`,
      { model: process.env.RERANKER_MODEL || 'bge-reranker-v2-m3', query, documents: docs, top_n: topK },
      { timeout: 20000 },
    )
    return (res.data.results as { index: number; relevance_score: number }[])
      .slice(0, topK)
      .map((r) => ({ i: r.index, s: r.relevance_score }))
  } catch {
    return null // 降级：用 RRF 融合分
  }
}
```

在 `retrieveMemories` 末尾：**先取 topK×3 候选 → rerank → 取 topK**（重排才有意义，不能只对 5 条重排）。

#### L3 竞赛杀手锏：无 RAG / 有 RAG 对比 ——【强烈建议，约 1 天】

`runAgent` 的 `ctx.withRag` **已经存在**，`/api/conversations/[id]/stream` 已透传 `withRag`。只需前端加个开关 + 并排面板：

```
[ 关闭 RAG ]  ←→  [ 开启 RAG ]
"我不记得你养过猫"        "记得你养了只橘猫叫年糕 [1]"
```

这是 README 里已经写了、但**目前只有后端能力、没有前端对比界面**的功能。做出来直接对应"RAG 效果对比"这个卖点，是评委最容易看懂的加分项。

### 1.3 加分项（有余力再做）

- **记忆类型权重**：`preference` > `note` > `chat`（偏好类记忆对个性化更有价值），在最终分上乘系数。
- **引用溯源**：`MemoryItem` 增加 `sourceMessageId`，前端引用可点击跳转。
- **检索缓存**：对 `rewriteQuery` 结果做 5 分钟内存 LRU，省一次 LLM 调用。

---

## 二、AI Agent 改造：从"线性 pipeline"到"真分支 + 工具调用"

### 2.1 问题定位

| 现状 | 问题 |
|------|------|
| `detectIntent()` 用正则 `/(写\|作\|画\|生成...)/` | 粗糙，"帮我看看这段代码为什么报错" 会误判 |
| 节点顺序固定，`route` 节点只算了个字符串 | **无真实分支**，各分支走的代码路径完全一样 |
| 无工具调用 | MCP 14 工具与 Agent 完全脱节，是两套东西 |
| 风险 ≥ high 时发个提示仍继续调 LLM | **假"人在回路"**，评委一问就穿帮 |
| `nodes` 是扁平数组 | 前端只能画线性时间线，"状态机"视觉上不成立 |

### 2.2 改造方案：Plan → Act → Observe

#### 步骤 1：意图识别改为 LLM 结构化输出（含正则降级）——【必做，半天】

新建 `src/lib/agent-router.ts`：

```ts
import { chatCompletion } from './ai-gateway'
import type { AiProviderConfig } from './types'

export const INTENTS = ['chat', 'creative', 'memory', 'help', 'tool'] as const
export type Intent = (typeof INTENTS)[number]

const SYSTEM = `你是意图分类器。只输出 JSON，不要任何解释：
{"intent":"chat|creative|memory|help|tool","confidence":0.0-1.0,"reason":"10字以内理由"}
- creative: 写诗/故事/歌词/画图等创作请求
- memory: 询问"上次/之前/记得"等历史信息
- help: 求助、倾诉、需要建议或情绪支持
- tool: 需要调用具体工具（查歌、记成长、翻译、总结对话等）
- chat: 普通闲聊`

export async function classifyIntent(
  input: string,
  provider: AiProviderConfig | null,
): Promise<{ intent: Intent; confidence: number; reason: string }> {
  if (provider?.apiKey) {
    try {
      const raw = await chatCompletion(provider, [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: input },
      ], { temperature: 0, maxTokens: 100 })
      const j = JSON.parse(raw.replace(/```json|```/g, '').trim())
      if (INTENTS.includes(j.intent)) {
        return { intent: j.intent, confidence: Number(j.confidence) || 0.8, reason: String(j.reason || '') }
      }
    } catch {
      /* 降级到正则 */
    }
  }
  return { ...regexFallback(input), confidence: 0.5, reason: '规则降级' }
}

/** 保留原正则作为降级路径，保证 LLM 不可用时演示不翻车 */
function regexFallback(text: string): { intent: Intent } {
  if (/(写|作|画|生成|创作|诗|故事|文章|谱曲|画图)/.test(text)) return { intent: 'creative' }
  if (/(我该怎么办|帮帮我|建议|开导|鼓励)/.test(text)) return { intent: 'help' }
  if (/(记得|回忆|上次|之前|那天|我们说过)/.test(text)) return { intent: 'memory' }
  if (/(查|搜索|多少|是什么|为什么|怎么)/.test(text)) return { intent: 'chat' }
  return { intent: 'chat' }
}
```

> **双路设计是答辩加分点**：可以现场演示"断网/无 Key 时自动降级为规则分类"，体现工程鲁棒性。

#### 步骤 2：真分支——不同 intent 走不同代码路径 ——【必做，1 天】

`runAgent` 中把 `route` 从"算个字符串"改成"真正分叉"：

```ts
const { intent, confidence, reason } = await classifyIntent(sanitized, provider)
push({ name: 'route', status: 'done', duration: elapsed(t4), detail: `→ ${intent}（${(confidence * 100).toFixed(0)}%｜${reason}）` })

switch (intent) {
  case 'memory':
    memories = await retrieveMemories({ query: rewritten, userId, topK: 10 }) // 记忆意图扩大召回
    break
  case 'creative':
    toolResult = await callTool('generate_creative', { type: guessType(input), prompt: input }, uid)
    push({ name: 'act', status: 'done', detail: '调用工具 generate_creative' })
    break
  case 'tool':
    toolResult = await runToolLoop(input, uid, provider, push) // ReAct 循环，见下
    break
  case 'help':
    careMode = true
    break
  default:
    memories = await retrieveMemories({ query: rewritten, userId, topK: 5 })
}
```

#### 步骤 3：真正的工具调用循环（ReAct，最多 2 轮）——【强烈建议，1 天】

复用已有的 `server/mcp-server.ts` 工具定义（把 `TOOLS` 数组抽到 `src/lib/mcp-tools.ts` 供前后端共用），用 function calling 让 LLM 选工具：

```ts
export async function runToolLoop(input: string, uid: string, provider: AiProviderConfig, push: (n: AgentNodeState) => void) {
  const tools = TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }))
  const observations: string[] = []
  for (let round = 0; round < 2; round++) {          // 硬上限，防死循环
    const res = await chatWithTools(provider, [
      { role: 'system', content: '你可以在需要时调用工具。若信息已足够，直接回答。' },
      { role: 'user', content: input },
      ...observations.map((o) => ({ role: 'tool' as const, content: o })),
    ], tools)
    const call = res.toolCalls?.[0]
    if (!call) break
    push({ name: `tool:${call.function.name}`, status: 'running' })
    const out = await callTool(call.function.name, JSON.parse(call.function.arguments || '{}'), uid)
    observations.push(JSON.stringify(out))
    push({ name: `tool:${call.function.name}`, status: 'done', detail: '已执行' })
  }
  return observations.at(-1)
}
```

> 这一步做完，**Agent 与 MCP 就从"两套孤立的东西"变成"一条链路"**——答辩时"MCP 14 工具"终于有了真实调用方。

#### 步骤 4：把"假中断"改成真中断 ——【必做，半天】

现在：`if (risk.humanReviewRequired) send(...) 然后继续调 LLM`。
改成：**直接终止本轮，返回 `interrupted` 事件**，前端弹出确认卡片，用户点"继续"才发起第二轮请求：

```ts
if (risk.humanReviewRequired) {
  send({ type: 'risk', data: risk })
  send({ type: 'interrupted', data: { reason: 'high_risk', resumeHint: '用户确认后可继续生成' } })
  controller.close()
  return   // ← 不再调用 LLM
}
```

前端 `agent-timeline.tsx` 增加"等待人工确认"态 + 确认按钮。**这是官方评分里"人在回路"的实证。**

#### 步骤 5：可视化改为树形 ——【建议，半天】

`AgentNodeState` 增加 `branch?: string` 与 `parent?: number`，前端把线性时间线改成**带分支的树**。视觉上一眼就是"图状态机"，直接回应"LangGraph 风格"的宣传口径。

### 2.3 如果决定不做改造（路线 B）

就把 README / DEFENSE 里的 **"LangGraph 风格状态机"** 全部改成 **"可编排的多节点工作流（支持条件分支与工具调用）"**。**不推荐**——上面五步合计约 3 天，收益远大于话术调整。

---

## 三、多模态改造：从 0 到 1（做三件，不做全套）

现状是**基础设施为零**。建议按性价比做三件，而不是把 Whisper/OCR/TTS/SD 全铺一遍。

### 3.1 图像理解（优先级最高，约 1 天）

**理由**：复用现有 `ai-gateway`（各家都支持 vision），改动最小，且能形成"AI 原生"的体验闭环。

在 `ai-gateway.ts` 增加：

```ts
export async function chatVision(provider: AiProviderConfig, prompt: string, base64: string, mime = 'image/jpeg'): Promise<string> {
  const baseUrl = normalizeBaseUrl(provider.baseUrl, provider.provider)

  if (provider.provider === 'anthropic') {
    const res = await axios.post(`${baseUrl.replace(/\/v1$/, '')}/v1/messages`, {
      model: provider.model, max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
        { type: 'text', text: prompt },
      ]}],
    }, { headers: { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' }, timeout: 60000 })
    return res.data.content?.[0]?.text ?? ''
  }

  // OpenAI 兼容：openai / qwen-vl / glm-4v / moonshot-vision / ollama(llava)
  const res = await axios.post(`${baseUrl}/chat/completions`, {
    model: provider.model,
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
    ]}],
  }, { headers: { Authorization: `Bearer ${provider.apiKey}` }, timeout: 60000 })
  return res.data.choices?.[0]?.message?.content ?? ''
}
```

**前端**：聊天输入框加图片选择（`<input type="file" accept="image/*">` → `FileReader` → base64）。

**闭环设计（关键）**：用户发一张照片 → 视觉模型输出 `{情绪, 场景描述}` → 直接驱动壁纸/音乐/主题：

```
用户上传一张阴雨天的窗外照
  → chatVision("分析这张图传达的情绪和场景，只输出 JSON")
  → { "emotion": "sad", "intensity": 55, "scene": "雨天的窗外" }
  → 界面切换深蓝雨滴壁纸 + 钢琴歌单 + 写入一条记忆
```

这一条链路把**多模态 → 情绪引擎 → 界面自适应 → 记忆**全部串起来，是"AI 原生"最直观的证据。

### 3.2 语音输入（Whisper 兼容协议，约半天）

`/v1/audio/transcriptions` 是事实标准，本地 `faster-whisper`、`FunASR`、通义、OpenAI 都兼容。

新建 `src/app/api/ai/transcribe/route.ts`：

```ts
export async function POST(req: NextRequest) {
  try {
    const uid = await requireUser()
    const { audio, mime = 'audio/webm' } = await req.json() // base64
    const base = process.env.WHISPER_BASE_URL
    if (!base) return fail('未配置语音服务（WHISPER_BASE_URL 为空）', 503)

    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from(audio, 'base64')], { type: mime }), 'audio.webm')
    fd.append('model', process.env.WHISPER_MODEL || 'whisper-1')

    const res = await axios.post(`${base.replace(/\/+$/, '')}/v1/audio/transcriptions`, fd, {
      headers: { Authorization: `Bearer ${process.env.WHISPER_API_KEY || ''}` }, timeout: 60000,
    })
    return ok({ text: res.data.text, userId: uid })
  } catch (e) { return handleApiError(e) }
}
```

**前端**：`MediaRecorder` 录音 → base64 → 转文字 → 直接走 Agent 流式接口，消息以 `type: 'audio'` 落库（`ChatMessage.type` 已支持）。**降级**：未配服务时录音按钮置灰并提示。

### 3.3 图像生成（可选，约 1 天）

现在"画画"入口只是跳到 `/create` 生成**文本**——这是最容易被评委发现的"名不副实"点。

**最小可用方案**：接 Stable Diffusion WebUI 的 `/sdapi/v1/txt2img`（`SD_BASE_URL` 已预留），或 OpenAI `/v1/images/generations`：

```
情绪 sad → prompt 模板注入情绪色彩 → 生成插画
  → 存为 Creation(type='image', content=<url>)
  → 可选"设为壁纸" → 联动 wallpaper-engine
```

如果时间不够，**至少把"画画"入口改成"AI 生成插画"的诚实文案**，别留破绽。

### 3.4 三个都做的降级原则（务必遵守）

所有外部服务统一模式：**未配置 → 优雅降级 + 明确提示**，绝不阻塞主流程。项目在 `ai-gateway` 上已有这个好习惯，多模态延续即可。评委在不配置任何服务的环境下跑，主流程必须通。

---

## 四、最重要的一步：把三块串成一条"AI 原生"叙事

单独改三项不如串成一条可演示的链路。建议对外统一讲这个：

```
语音 / 文字 / 图片输入
        ↓
   [多模态理解]  Whisper 转写 · Vision 读图情绪
        ↓
   [情绪识别]   7 类情绪 + 强度
        ↓
   [RAG 检索]   真向量 + BM25 混合 + reranker 重排 → 相关个人记忆
        ↓
   [AI Agent]   LLM 意图分类 → 分支决策 → 工具调用（MCP 14 工具）
        ↓
   [大模型生成] 9 厂商统一网关 · 流式输出 · 失败降级
        ↓
   输出：文本 / 插画 / 歌单 → 驱动界面（壁纸·音乐·主题）→ 写回长期记忆
```

**这条链里第九届考核的四项全部出现，而且每一项都是真的。** 这就是赛道说明里"AI 原生 Web 应用"的标准答案——把 PPT 第 4 页的系统架构图换成这张，比现在罗列 8 个模块有说服力得多。

---

## 五、工作量与 4 周排期

| 周次 | 任务 | 产出 |
|------|------|------|
| **W1** | RAG L1+L2（embedding + reranker，1.5 天）· 修 `crypto.ts`（0.5 天）· 部署上线（1.5 天）· `git init` + 冒烟测试（0.5 天） | 检索语义化 + 有公网链接 |
| **W2** | Agent 步骤 1+2+4（意图分类 + 真分支 + 真中断，2.5 天）· 图像理解（2 天） | Agent 可演示分支、图片能读 |
| **W3** | 语音输入（0.5 天）· 无/有 RAG 对比面板（1 天）· Agent 步骤 3 工具循环（1.5 天）· 可视化树形（0.5 天） | 四要素全通 |
| **W4** | 图像生成或降级文案（1 天）· 视觉矩阵截图 · **《作品创作说明》+ 演示视频** · 联调 | 完整参赛材料 |

> **若时间紧张，取舍顺序**：RAG L1 → Agent 意图分类+真分支 → 图像理解 → 真中断 → 无/有 RAG 对比 → 语音 → 工具循环 → 图像生成。
> **前三项做完（约 4 天），AI 四要素落地度可从 50% 提到 75%+，技术实现分 6.5 → 8.0。**

---

## 六、风险与注意事项

1. **所有改造必须保留降级路径**，否则评委环境无 Key 直接白屏，得不偿失。
2. **改动前先 `git init` 并提交一次基线**——现在没有版本控制，改坏了无法回滚。这是本方案的前置动作。
3. **别为了"四项都真"而无限扩大范围**：图像生成、TTS、OCR 属于"锦上添花"，做不完就诚实降级话术，不要留着"名不副实"的破绽。
4. **同步更新宣传口径**：改完后 README / DEFENSE 要能一一对应到代码行，这是评委核验时的第一道防线。
