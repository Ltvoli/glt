'use server'

import { encrypt, decrypt } from '@/lib/session'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

export async function loginAction(prevState: any, formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  if (!email || !password) return { success: false, error: 'Identifiants requis' }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive || user.archivedAt) {
      return { success: false, error: 'Identifiants invalides ou compte désactivé' }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return { success: false, error: 'Identifiants invalides' }
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true }
    })
    const permissions = rolePermissions.map(rp => rp.permission.key)

    const activeModulesData = await prisma.module.findMany({
      where: { isActive: true },
      select: { key: true }
    })
    const activeModules = activeModulesData.map(m => m.key)

    const ttlSetting = await prisma.setting.findUnique({ where: { key: 'auth.session_ttl' } })
    const sessionTtl = ttlSetting ? parseInt(ttlSetting.value, 10) : 86400

    const token = await encrypt({
      sub: user.id,
      role: user.role,
      permissions,
      activeModules
    }, sessionTtl)

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      maxAge: sessionTtl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })

    return { success: true }
  } catch (err) {
    console.error('Login error:', err)
    return { success: false, error: 'Erreur interne du serveur' }
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  cookieStore.set('session', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  })
  return { success: true }
}

export async function refreshAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return { success: false, error: 'Non authentifié' }

  const payload = await decrypt(sessionCookie)
  if (!payload || !payload.sub) return { success: false, error: 'Session invalide' }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive || user.archivedAt) {
      return { success: false, error: 'Compte désactivé' }
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true }
    })
    const permissions = rolePermissions.map(rp => rp.permission.key)

    const activeModulesData = await prisma.module.findMany({
      where: { isActive: true },
      select: { key: true }
    })
    const activeModules = activeModulesData.map(m => m.key)

    const ttlSetting = await prisma.setting.findUnique({ where: { key: 'auth.session_ttl' } })
    const sessionTtl = ttlSetting ? parseInt(ttlSetting.value, 10) : 86400

    const token = await encrypt({
      sub: user.id,
      role: user.role,
      permissions,
      activeModules
    }, sessionTtl)

    cookieStore.set('session', token, {
      maxAge: sessionTtl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Erreur lors du rafraîchissement' }
  }
}

export async function validatePasswordStrength(password: string): Promise<string | null> {
  if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.'
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.'
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule.'
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.'
  return null
}
