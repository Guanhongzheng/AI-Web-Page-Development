import { NextRequest } from 'next/server'
import { ok, handleApiError } from '@/lib/api'
import { searchSongs, enrichWithUrl } from '@/lib/netease'

export async function GET(req: NextRequest) {
  try {
    const keyword = new URL(req.url).searchParams.get('keyword') ?? ''
    const songs = await searchSongs(keyword, 20)
    const withUrl = await enrichWithUrl(songs)
    return ok(withUrl)
  } catch (e) {
    return handleApiError(e)
  }
}
