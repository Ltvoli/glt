import { SignJWT, jwtVerify } from 'jose'
import { Role } from '@prisma/client'

const secretKey = process.env.JWT_SECRET || 'dev-secret-key'
const key = new TextEncoder().encode(secretKey)

export type JWTPayload = {
  sub: string
  role: Role
  permissions: string[]
  activeModules: string[]
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
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}

import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  
  const payload = await decrypt(session)
  if (!payload) return null
  
  return {
    userId: payload.sub,
    role: payload.role,
    permissions: payload.permissions,
    activeModules: payload.activeModules
  }
}

export async function requireWriteAccess() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  if (session.role === 'READONLY') throw new Error('Accès en lecture seule. Action interdite.')
  return session
}
