# PersonaMate AI · API 文档

基础路径：`/api`，需登录（Cookie `pm_token`）。统一响应：`{ ok: boolean, data?, error? }`。

## 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 `{username,email,password}` |
| POST | `/api/auth/login` | 登录 `{account,password}` |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 当前用户 |

## 用户与画像
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/PATCH | `/api/profiles` | 获取/更新画像（displayName/bio/persona） |
| GET/POST/DELETE | `/api/memories` | 记忆库；`?q=` 触发 RAG 混合检索，`?type=` 过滤 |
| GET/POST | `/api/emotions` | 情绪记录 |
| GET | `/api/growth` | 成长报告（情感曲线序列 + 统计） |

## 对话
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/conversations` | 会话列表/创建（type: ai/user/group） |
| GET/POST | `/api/conversations/[id]/messages` | 消息列表/发送 |
| POST | `/api/conversations/[id]/stream` | **AI 流式 SSE**：事件 `node`/`emotion`/`memories`/`token`/`done`/`error` |
| POST | `/api/conversations/[id]/read` | 已读回执 |
| POST | `/api/conversations/[id]/typing` | 输入中状态（也走 Socket） |

实时通信：Socket.io，路径 `/api/socket`，事件：`join-conversation`/`typing`/`new-message`/`message-read`/`presence`。

## AI 辅助（用户单聊/群聊可用，需主动触发）
| 方法 | 路径 | Body | 返回 |
|------|------|------|------|
| POST | `/api/ai/summarize` | `{content}` | 要点总结 |
| POST | `/api/ai/translate` | `{content, targetLang?}` | 译文 |
| POST | `/api/ai/suggest-reply` | `{content}` | 3 条风格建议 `[{style,text}]` |
| POST | `/api/ai/polish` | `{content}` | 润色文本 |
| POST | `/api/ai/emotion` | `{content}` | `{label,intensity,confidence}` |
| POST | `/api/ai/test` | `{provider,baseUrl,apiKey,model}` 或 `{id}` | `{ok,latency,error?}` |

## 创作与成长
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/creations` | 创作 `{type:poem/story/note/song, prompt}` |
| GET | `/api/growth` | 情感曲线 + 统计 |

## 音乐
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/music/search?keyword=` | 搜索歌曲 |
| GET | `/api/music/recommend?mood=sad` | MusicAgent 情绪推荐（JSON：mood/genres/tempo/keywords/playlist_name/reason/transition/tracks） |

## 壁纸
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/wallpapers?preset=` | 预设壁纸库 |
| POST | `/api/wallpapers` | AI 生成配色 `{prompt}` |

## AI 服务商（用户自带接口）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-providers` | 列表（API Key 返回掩码） |
| POST | `/api/ai-providers` | 新增/更新（AES-256-GCM 加密存储） |
| PATCH | `/api/ai-providers` | 启用/停用 `{id,isActive}` |
| DELETE | `/api/ai-providers` | 删除 |

## MCP
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/mcp/logs` | 工具列表 + 调用审计日志 |

14 个 MCP 工具：`search_memory` / `analyze_emotion` / `generate_creative` / `get_calendar` / `play_music` / `log_growth` / `encrypt_data` / `search_music` / `get_daily_recommend` / `recommend_by_emotion` / `create_playlist` / `summarize_conversation` / `suggest_reply` / `translate_message`。

## 好友
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/friends` | 列表/发起请求 `{targetId}` |
| POST | `/api/friends/accept` | 接受/拒绝 `{id, accept}` |

## SSE 流式事件格式
```
data: {"type":"node","node":{"name":"emotion","status":"done","duration":12,"detail":"sad 70"}}
data: {"type":"memories","data":[{"id":"...","content":"...","score":0.82}]}
data: {"type":"token","data":"你好"}
data: {"type":"done"}
```
