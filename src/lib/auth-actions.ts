'use server'

import { encrypt as encryptJWT, decrypt as decryptJWT } from '@/lib/session'
import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'

import bcrypt from 'bcryptjs'
import { decrypt as decryptAES, totp } from '@/lib/crypto'
import { logAudit } from '@/lib/audit'
import crypto from 'crypto'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

export type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

function parseDeviceName(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows PC'
  if (userAgent.includes('Macintosh')) return 'Mac'
  if (userAgent.includes('iPhone')) return 'iPhone'
  if (userAgent.includes('iPad')) return 'iPad'
  if (userAgent.includes('Android')) return 'Android Device'
  if (userAgent.includes('Linux')) return 'Linux PC'
  return 'Navigateur Web'
}

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ requires2FA?: boolean; email?: string }>> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const code = formData.get('code') as string
  
  if (!email || !password) return { success: false, error: 'Identifiants requis' }

  try {
    const reqHeaders = await headers()
    const ipAddress = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || 'unknown'
    const userAgent = reqHeaders.get('user-agent') || null
    const deviceName = userAgent ? parseDeviceName(userAgent) : 'Web client'

    // 1. Check Rate Limit BEFORE database lookup
    const rateLimit = checkRateLimit(ipAddress)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil((rateLimit.remainingMs || 0) / 60000)
      return { success: false, error: `Trop de tentatives. Veuillez réessayer dans ${minutes} minute(s).` }
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.archivedAt) {
      // Pour éviter de donner des infos sur l'existence de l'email, on log avec un ID factice ou "SYSTEM"
      await logAudit('LOGIN_FAILED', 'User', 'UNKNOWN', 'SYSTEM', { email, ip: ipAddress, reason: 'User not found or archived' }, ipAddress !== 'unknown' ? ipAddress : undefined)
      return { success: false, error: 'Identifiants invalides ou compte désactivé' }
    }

    if (user.suspendedAt) {
      await logAudit('LOGIN_FAILED', 'User', user.id, user.id, { ip: ipAddress, reason: 'Account suspended' }, ipAddress !== 'unknown' ? ipAddress : undefined)
      return { success: false, error: 'Compte suspendu' }
    }

    if (!user.isActive) {
      await logAudit('LOGIN_FAILED', 'User', user.id, user.id, { ip: ipAddress, reason: 'Account inactive' }, ipAddress !== 'unknown' ? ipAddress : undefined)
      return { success: false, error: 'Compte inactif' }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      await logAudit('LOGIN_FAILED', 'User', user.id, user.id, { ip: ipAddress, reason: 'Invalid password' }, ipAddress !== 'unknown' ? ipAddress : undefined)
      return { success: false, error: 'Identifiants invalides' }
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!code) {
        return {
          success: false,
          error: 'Code de sécurité 2FA requis',
          data: { requires2FA: true, email }
        }
      }

      const decryptedSecret = decryptAES(user.twoFactorSecret!)
      const isValid2FA = await totp.verify(code, { secret: decryptedSecret })
      if (!isValid2FA) {
        return {
          success: false,
          error: 'Code de sécurité 2FA invalide',
          data: { requires2FA: true, email }
        }
      }
    }

    // If login succeeds (even partially for 2FA), reset the rate limit
    resetRateLimit(ipAddress)

    // Session unique identifier (JTI)
    const jti = crypto.randomUUID()
    const deviceType = userAgent?.toLowerCase().includes('mobile') ? 'MOBILE' : 'WEB'

    // Create session in DB
    await prisma.userSession.create({
      data: {
        userId: user.id,
        jti,
        deviceType,
        deviceName,
        ipAddress,
        userAgent
      }
    })

    // Update login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      }
    })

    // Retrieve permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true }
    })
    const permissions = rolePermissions.map(rp => rp.permission.key)

    // Retrieve active modules
    const activeModulesData = await prisma.module.findMany({
      where: { isActive: true },
      select: { key: true }
    })
    const activeModules = activeModulesData.map(m => m.key)

    const ttlSetting = await prisma.setting.findUnique({ where: { key: 'auth.session_ttl' } })
    const sessionTtl = ttlSetting ? parseInt(ttlSetting.value, 10) : 86400

    const token = await encryptJWT({
      sub: user.id,
      role: user.role,
      permissions,
      activeModules,
      jti
    }, sessionTtl)

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      maxAge: sessionTtl,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })

    // Log in AuditLog
    await logAudit('LOGIN', 'User', user.id, user.id, { ip: ipAddress, deviceName }, ipAddress !== 'unknown' ? ipAddress : undefined)

    return { success: true }
  } catch (err: any) {
    console.error('Login error:', err)
    return { success: false, error: 'Erreur interne du serveur' }
  }
}

export async function logoutAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (sessionCookie) {
    const payload = await decryptJWT(sessionCookie)
    if (payload && payload.jti) {
      // Revoke the session in database
      await prisma.userSession.updateMany({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() }
      })
      await logAudit('LOGOUT', 'User', payload.sub, payload.sub, { jti: payload.jti })
    }
  }

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

  const payload = await decryptJWT(sessionCookie)
  if (!payload || !payload.sub || !payload.jti) return { success: false, error: 'Session invalide' }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive || user.archivedAt || user.suspendedAt) {
      return { success: false, error: 'Compte inactif ou suspendu' }
    }

    // Verify session revoked status in DB
    const sessionRecord = await prisma.userSession.findUnique({
      where: { jti: payload.jti }
    })
    if (!sessionRecord || sessionRecord.revokedAt) {
      return { success: false, error: 'Session révoquée' }
    }

    // Update activity timestamp in DB
    await prisma.userSession.update({
      where: { jti: payload.jti },
      data: { lastActiveAt: new Date() }
    })

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

    const token = await encryptJWT({
      sub: user.id,
      role: user.role,
      permissions,
      activeModules,
      jti: payload.jti
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

