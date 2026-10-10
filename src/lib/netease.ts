import axios from 'axios'

/**
 * 网易云音乐 API 统一客户端（对接 NeteaseCloudMusicApi 服务）
 * 服务地址由 NETEASE_API_BASE 配置，默认本地 3003
 */
export const NETEASE_BASE = process.env.NETEASE_API_BASE || 'http://localhost:3003'
const COOKIE = process.env.NETEASE_COOKIE || ''

export async function neteaseRequest(path: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = await axios.get(`${NETEASE_BASE}${path}`, {
    params: { ...params, cookie: COOKIE },
    timeout: 10000,
  })
  return res.data
}

function mapSong(s: any) {
  return {
    id: String(s.id),
    name: s.name,
    artist: s.ar?.[0]?.name ?? s.artists?.[0]?.name ?? '未知',
    album: s.al?.name ?? s.album?.name,
    cover: s.al?.picUrl ?? s.album?.picUrl,
    duration: s.dt ?? s.duration,
  }
}

/** 搜索歌曲 */
export async function searchSongs(keyword: string, limit = 20) {
  const data = await neteaseRequest('/search', { keywords: keyword, limit })
  return (data?.result?.songs ?? []).map(mapSong)
}

/** 每日推荐 */
export async function getDailySongs() {
  const data = await neteaseRequest('/recommend/songs', {})
  return (data?.data?.dailySongs ?? []).map(mapSong)
}

/** 歌单详情 */
export async function getPlaylistTracks(id: string) {
  const data = await neteaseRequest('/playlist/track/all', { id, limit: 50 })
  return (data?.songs ?? []).map(mapSong)
}

/** 批量获取播放地址（返回 id -> url 映射） */
export async function getSongUrls(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {}
  const data = await neteaseRequest('/song/url', { id: ids.join(',') })
  const map: Record<string, string> = {}
  for (const d of data?.data ?? []) {
    if (d?.url) map[String(d.id)] = d.url
  }
  return map
}

/** 检测网易云连接与登录状态 */
export async function checkNeteaseStatus() {
  const start = Date.now()
  const data = await neteaseRequest('/login/status', {})
  const profile = data?.data?.profile
  return {
    connected: true,
    latency: Date.now() - start,
    loggedIn: !!profile,
    nickname: profile?.nickname ?? null,
    userId: profile?.userId ? String(profile.userId) : null,
    avatar: profile?.avatarUrl ?? null,
  }
}

/** 给曲目列表补上可播放 url */
export async function enrichWithUrl<T extends { id: string }>(tracks: T[]): Promise<(T & { url?: string })[]> {
  try {
    const urls = await getSongUrls(tracks.map((t) => t.id))
    return tracks.map((t) => ({ ...t, url: urls[t.id] }))
  } catch {
    return tracks.map((t) => ({ ...t, url: undefined }))
  }
}
