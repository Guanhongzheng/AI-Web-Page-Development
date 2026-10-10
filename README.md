# PersonaMate AI · 个性化多模态 AI 伴侣与社交对话平台

一个主打**用户个性体验**的 AI Web 应用：情绪自适应界面、长期个人记忆（RAG）、个性化 AI 伴侣、AI 辅助真实社交、动态壁纸与音乐联动、**用户自带 AI 接口**。

## ✨ 核心特性

| 方向 | 实现 |
|------|------|
| AI Agent 智能助手 | LangGraph 风格状态机（Intent/Emotion/MemoryRetrieve/Route/PersonaResponse/Creative/Growth/Privacy 8 节点），思考链 SSE 可视化 |
| RAG 个人记忆 | BM25 + 向量混合检索、RRF 融合排序、bge-reranker 重排 Top5、LLM 查询改写、时间衰减、引用溯源、无 RAG vs 有 RAG 对比 |
| 多模态 | 文本/语音(Whisper)/图像(OCR+视觉)/情感分析/TTS/Stable Diffusion 插画 |
| AI 安全 | 双向 Guardrails、PII 检测（redact/mask/hash/block）、风险评分 0-100、人在回路、AIGC 水印、AES-256-GCM 加密存储 API Key |
| 实时社交 | Socket.io 实时消息、在线状态、输入中、已读回执；群聊 AI 被 @ 唤醒、自动总结、情绪感知 |
| 情绪自适应 | 7 种情绪标签（happy/sad/anxious/angry/calm/excited/neutral），强度 0-100，实时调整主题色/壁纸/音乐/动效 |
| 动态壁纸 | CSS 渐变流光 / Canvas 粒子星空雨滴 / Three.js 音乐响应网格，2000ms 平滑过渡 |
| 音乐系统 | 网易云 API Enhanced，MusicAgent 按情绪生成推荐策略，悬浮播放器带频谱可视化 |
| 日夜间模式 | 亮色/暗色/跟随系统，SunCalc 日出日落自动切换，transition-colors 不闪屏 |
| 玻璃质感 | 三级强度（blur 8/16/24px），高光 ::before + 径向渐变 ::after，同屏≤4 个 backdrop-blur |
| 用户自带 AI | 9 种服务商（OpenAI/DeepSeek/通义/智谱/Moonshot/Anthropic/Gemini/Ollama/自定义），统一网关，失败自动降级 |
| MCP | 自建 Server 14 个工具，全量调用审计 + 前端时间线可视化 |

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env   # 填入 ENCRYPTION_KEY（64 位 hex）等

# 3. 初始化数据库
npx prisma db push
npx prisma db seed    # 演示账号 demo / demo123

# 4. 启动开发
npm run dev
# 打开 http://localhost:3000
```

## 🐳 Docker 部署

```bash
docker compose up -d --build
```

## 📁 项目结构

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # 登录/注册
│   ├── (main)/           # 主页/对话/记忆/创作/成长/画像/设置
│   └── api/              # 全部后端 API
├── components/
│   ├── ui/               # shadcn 风格基础组件
│   ├── wallpaper-engine.tsx      # 动态壁纸引擎
│   ├── floating-music-player.tsx # 悬浮播放器
│   ├── agent-timeline.tsx        # Agent 思考链
│   ├── memory-panel.tsx          # RAG 引用展示
│   └── emotion-indicator.tsx     # 情绪指示器
├── lib/
│   ├── agent.ts          # LangGraph 风格 Agent 工作流
│   ├── rag.ts            # 混合检索 RAG 引擎
│   ├── ai-gateway.ts     # 统一模型网关（9 服务商 + 流式）
│   ├── emotion.ts        # 情绪分析
│   ├── safety.ts         # 安全/PII/风险评分
│   └── crypto.ts         # AES-256-GCM 加密
├── stores/               # Zustand 状态
└── hooks/                # use-socket 等
server/
└── mcp-server.ts         # MCP Server（14 工具）
prisma/schema.prisma      # 19 张表
```

## 📚 文档

- [API 文档](./docs/API.md)
- [答辩 PPT 大纲](./docs/DEFENSE.md)
- [Git 版本管理说明](./docs/GIT-版本管理.md)

## 📜 关于本仓库历史

本仓库的 Git 历史由**开发阶段快照**整理而成：项目开发期间以本地文件夹备份的方式保存了 5 个阶段成果，随后统一导入为 Git 提交（对应 tag `v0.1` ~ `v0.5`）。因此这些早期提交是**阶段性的整体快照**，粒度较粗，并非逐次的小提交记录。

自 `v1.0`（版本控制基线）起，后续开发均以**正常的增量提交**方式记录。

## 🔒 隐私与安全承诺

- API Key 全程 AES-256-GCM 加密，前端与日志只显示掩码（前 6 位 + 后 4 位）
- AI 辅助用户对话**必须用户主动触发**，不偷看私信
- 群聊中 AI 默认只在被 @ 时回复，不打扰
- 所有数据可查看、可导出、可删除
