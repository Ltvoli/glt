import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'dev-secret-key'
const key = new TextEncoder().encode(secretKey)

const publicRoutes = ['/login', '/auth/unauthorized']

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

  if (publicRoutes.includes(path)) {
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

  if (!sessionPayload || !sessionPayload.sub) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  const { role, activeModules } = sessionPayload as any

  // Admin section
  if (path.startsWith('/admin')) {
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.nextUrl))
    }
  }

  // Module section
  for (const [routePrefix, moduleKey] of Object.entries(modulePathMap)) {
    if (path.startsWith(routePrefix)) {
      if (!activeModules.includes(moduleKey)) {
        // Module inactif -> 404
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
