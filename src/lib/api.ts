import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError } from './auth'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

export function handleApiError(e: unknown) {
  if (e instanceof AuthError) return fail(e.message, 401)
  if (e instanceof ZodError) return fail('参数校验失败', 400, { issues: e.flatten() })
  const err = e as Error
  return fail(err.message || '服务器错误', 500)
}

export function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}
