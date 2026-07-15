import { SignJWT, jwtVerify } from 'jose'
import { Role } from '@prisma/client'
import { isPermissionsCacheLoaded, refreshPermissionsCache } from './permissions'

const secretKey = process.env.JWT_SECRET || 'dev-secret-key'
const key = new TextEncoder().encode(secretKey)

export type JWTPayload = {
  sub: string
  role: Role
  permissions: string[]
  activeModules: string[]
  jti: string
  iat?: number
  exp?: number
}

export async function encrypt(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInSeconds: number) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(key)
}

export async function decrypt(input: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload as any as JWTPayload
  } catch (error) {
    return null
  }
}

import { cookies } from 'next/headers'

// Role mapping for backwards compatibility with legacy business modules
export function mapRoleToLegacy(role: Role): 'SUPERADMIN' | 'ADMIN' | 'USER' | 'READONLY' {
  switch (role) {
    case 'ADMINISTRATEUR':
      return 'SUPERADMIN'
    case 'SUPERVISEUR':
      return 'ADMIN'
    case 'COORDINATEUR':
      return 'USER'
    case 'USER':
    default:
      return 'READONLY'
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  
  const payload = await decrypt(session)
  if (!payload) return null

  // Auto-initialize permissions cache if it was cleared/restart occurred
  if (!isPermissionsCacheLoaded()) {
    await refreshPermissionsCache()
  }
  
  return {
    userId: payload.sub,
    role: mapRoleToLegacy(payload.role), // Legacy mapped role (SUPERADMIN, ADMIN, USER, READONLY)
    dbRole: payload.role,              // Raw DB role (ADMINISTRATEUR, SUPERVISEUR, etc.)
    permissions: payload.permissions,
    activeModules: payload.activeModules,
    jti: payload.jti
  }
}

export async function requireWriteAccess() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  if (session.role === 'READONLY') throw new Error('Accès en lecture seule. Action interdite.')
  return session
}
