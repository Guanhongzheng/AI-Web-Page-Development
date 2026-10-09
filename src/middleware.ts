import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth']

export function middleware(req: NextRequest) {
  const token = req.cookies.get('pm_token')?.value
  const path = req.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === '/_next' || path.startsWith('/api/socket')
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (token && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
