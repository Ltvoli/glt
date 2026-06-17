import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'dev-secret-key'
const key = new TextEncoder().encode(secretKey)

const modulePathMap: Record<string, string> = {
  '/contacts': 'contacts',
  '/tasks': 'tasks',
  '/mails': 'mailcases',
  '/qe': 'questions',
  '/planning': 'agenda',
  '/reports': 'reports',
  '/permanences': 'permanences'
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Public routes — no auth required
  const isPublic =
    path === '/login' ||
    path === '/admin-login' ||
    path === '/auth/unauthorized' ||
    path.startsWith('/invite/')
  if (isPublic) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get('session')?.value
  let sessionPayload = null

  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, key, { algorithms: ['HS256'] })
      sessionPayload = payload
    } catch (err) {
      // invalid token
    }
  }

  // ── /admin routes: require ADMINISTRATEUR, redirect to /admin-login ──
  if (path.startsWith('/admin')) {
    if (!sessionPayload || !sessionPayload.sub) {
      return NextResponse.redirect(new URL('/admin-login', req.nextUrl))
    }
    const { role } = sessionPayload as any
    if (role !== 'ADMINISTRATEUR' && role !== 'SUPERVISEUR') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.nextUrl))
    }
    return NextResponse.next()
  }

  // ── All other routes: require any valid session ──────────────────────
  if (!sessionPayload || !sessionPayload.sub) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  const { activeModules } = sessionPayload as any

  // Module section guard
  for (const [routePrefix, moduleKey] of Object.entries(modulePathMap)) {
    if (path.startsWith(routePrefix)) {
      if (!activeModules || !activeModules.includes(moduleKey)) {
        req.nextUrl.pathname = '/404'
        return NextResponse.rewrite(req.nextUrl)
      }
    }
  }

  return NextResponse.next()
}


export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

