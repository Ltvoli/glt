'use server'

import { encrypt as encryptJWT } from '@/lib/session'
import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAudit } from '@/lib/audit'
import crypto from 'crypto'

export type SuperAdminLoginResult = {
  success: boolean
  error?: string
  requires2FA?: boolean
  email?: string
}

export async function superAdminLoginAction(
  prevState: SuperAdminLoginResult,
  formData: FormData
): Promise<SuperAdminLoginResult> {
  const email    = (formData.get('email')    as string)?.trim()
  const password = formData.get('password')  as string
  const code     = (formData.get('code')     as string)?.trim()

  if (!email || !password) {
    return { success: false, error: 'Identifiants requis.' }
  }

  const reqHeaders = await headers()
  const ipAddress  = reqHeaders.get('x-forwarded-for')?.split(',')[0]
                  || reqHeaders.get('x-real-ip')
                  || null
  const userAgent  = reqHeaders.get('user-agent') || null

  try {
    // ── 1. Find user ─────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.archivedAt || !user.isActive || user.suspendedAt) {
      await new Promise(r => setTimeout(r, 400)) // Constant-time delay
      return { success: false, error: 'Accès refusé.' }
    }

    // ── 2. Role gate — ADMINISTRATEUR only ───────────────────
    if (user.role !== 'ADMINISTRATEUR') {
      await logAudit('SUPERADMIN_LOGIN_DENIED', 'User', user.id, user.id, {
        reason: 'ROLE_INSUFFICIENT',
        role: user.role,
        ip: ipAddress,
      })
      // Generic error — don't reveal account exists with different role
      return { success: false, error: 'Accès refusé.' }
    }

    // ── 3. Password check ────────────────────────────────────
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      await logAudit('SUPERADMIN_LOGIN_FAILED', 'User', user.id, user.id, {
        reason: 'WRONG_PASSWORD',
        ip: ipAddress,
      })
      return { success: false, error: 'Identifiants invalides.' }
    }

    // ── 4. 2FA — always required for super admin ─────────────
    if (!code) {
      // If user has 2FA configured, require the TOTP code
      // If not configured, require setup before access (return special error)
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return {
          success: false,
          error: 'La double authentification (2FA) est obligatoire pour accéder à ce panneau. Configurez-la dans vos paramètres.',
        }
      }
      return {
        success: false,
        requires2FA: true,
        email,
        error: 'Code de double authentification requis.',
      }
    }

    // Verify 2FA code
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return {
        success: false,
        error: 'La double authentification est obligatoire pour cet accès. Veuillez la configurer d\'abord.',
      }
    }

    const { decrypt: decryptAES, totp } = await import('@/lib/crypto')
    const secret       = decryptAES(user.twoFactorSecret)
    const isValid2FA   = await totp.verify(code, { secret })

    if (!isValid2FA) {
      await logAudit('SUPERADMIN_LOGIN_FAILED', 'User', user.id, user.id, {
        reason: 'WRONG_2FA_CODE',
        ip: ipAddress,
      })
      return {
        success: false,
        requires2FA: true,
        email,
        error: 'Code 2FA invalide ou expiré.',
      }
    }

    // ── 5. Create session ────────────────────────────────────
    const jti = crypto.randomUUID()

    await prisma.userSession.create({
      data: {
        userId:     user.id,
        jti,
        deviceType: userAgent?.toLowerCase().includes('mobile') ? 'MOBILE' : 'WEB',
        deviceName: 'Super Admin Login',
        ipAddress,
        userAgent,
      }
    })

    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date(), lastLoginIp: ipAddress }
    })

    // Full SUPERADMIN permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where:   { role: user.role },
      include: { permission: true }
    })
    const permissions = rolePermissions.map(rp => rp.permission.key)

    const activeModulesData = await prisma.module.findMany({
      where:  { isActive: true },
      select: { key: true }
    })
    const activeModules = activeModulesData.map(m => m.key)

    const token = await encryptJWT({
      sub:           user.id,
      role:          user.role,
      permissions,
      activeModules,
      jti,
    }, 3600 * 8) // 8h session

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      maxAge:   3600 * 8,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
    })

    await logAudit('SUPERADMIN_LOGIN', 'User', user.id, user.id, {
      ip:         ipAddress,
      deviceName: 'Super Admin Panel',
    }, ipAddress || undefined)

    return { success: true }

  } catch (err: any) {
    console.error('[SuperAdmin Login Error]', err)
    return { success: false, error: 'Erreur interne du serveur.' }
  }
}
