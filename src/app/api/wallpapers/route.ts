import { NextRequest } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'
import { ok } from '@/lib/api'

const ALLOWED = /\.(jpe?g|png|gif|webp|svg|html)$/i

export async function GET(_req: NextRequest) {
  const dir = path.join(process.cwd(), 'public', 'wallpapers')
  let files: string[] = []
  try {
    files = (await readdir(dir)).filter((f) => ALLOWED.test(f)).sort()
  } catch {
    files = []
  }
  const list = files.map((f) => ({
    src: `/wallpapers/${encodeURIComponent(f)}`,
    label: f.replace(/\.[^.]+$/, ''),
    html: /\.html$/i.test(f),
  }))
  return ok(list)
}
