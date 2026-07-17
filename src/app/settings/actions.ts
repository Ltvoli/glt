'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/lib/auth-actions'
import { encrypt, decrypt, totp } from '@/lib/crypto'
import QRCode from 'qrcode'
import { cookies } from 'next/headers'

async function requireUserSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  return session
}

// 1. Update personal profile details
export async function updateProfileAction(
  firstName: string,
  lastName: string,
  email: string,
  mobilePhone?: string
): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      return { success: false, error: 'Tous les champs sont obligatoires' }
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!oldUser) return { success: false, error: 'Utilisateur introuvable' }

    // Check if email already in use
    if (email.trim().toLowerCase() !== oldUser.email.toLowerCase()) {
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' }, archivedAt: null }
      })
      if (existing) {
        return { success: false, error: 'Cette adresse email est déjà utilisée par un autre compte.' }
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        mobilePhone: mobilePhone ? mobilePhone.trim() : null
      }
    })

    await logAudit(
      'UPDATE_PROFILE',
      'User',
      session.userId,
      session.userId,
      {
        newValues: { firstName: updated.firstName, lastName: updated.lastName, email: updated.email, mobilePhone: updated.mobilePhone },
        oldValues: { firstName: oldUser.firstName, lastName: oldUser.lastName, email: oldUser.email, mobilePhone: oldUser.mobilePhone }
      }
    )

    revalidatePath('/settings/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 2. Update display preferences
export async function updatePreferencesAction(
  locale: string,
  timezone: string,
  theme: string
): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    const oldUser = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!oldUser) return { success: false, error: 'Utilisateur introuvable' }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        locale,
        timezone,
        theme
      }
    })

    await logAudit(
      'UPDATE_PREFERENCES',
      'User',
      session.userId,
      session.userId,
      {
        newValues: { locale, timezone, theme },
        oldValues: { locale: oldUser.locale, timezone: oldUser.timezone, theme: oldUser.theme }
      }
    )

    revalidatePath('/settings/preferences')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 3. Generate TOTP secret and QR Code for 2FA setup
export async function generate2FaSecretAction(): Promise<ActionResult<{ secret: string; qrCodeUrl: string }>> {
  try {
    const session = await requireUserSession()

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) return { success: false, error: 'Utilisateur introuvable' }

    // Generate a new temporary secret
    const secret = totp.generateSecret()
    const otpauth = totp.toURI({ secret, label: user.email, issuer: 'CDC Bureau Lionel Tivoli' })
    
    // Generate QR Code data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauth)

    return {
      success: true,
      data: { secret, qrCodeUrl }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de la génération de la clé 2FA' }
  }
}

// 4. Verify token and enable 2FA
export async function enable2FaAction(token: string, secret: string): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    if (!token || !secret) {
      return { success: false, error: 'Données manquantes' }
    }

    const isValid = await totp.verify(token, { secret })
    if (!isValid) {
      return { success: false, error: 'Le code de validation est incorrect' }
    }

    // Encrypt secret for DB storage
    const encryptedSecret = encrypt(secret)

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret
      }
    })

    await logAudit(
      'ENABLE_2FA',
      'User',
      session.userId,
      session.userId,
      { message: 'Validation et activation de la double authentification (2FA) réussies.' }
    )

    revalidatePath('/settings/security')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de l\'activation' }
  }
}

// 5. Disable 2FA
export async function disable2FaAction(token: string): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user || !user.twoFactorSecret) {
      return { success: false, error: 'Double authentification non active.' }
    }

    // Decrypt secret to verify
    const secret = decrypt(user.twoFactorSecret)

    const isValid = await totp.verify(token, { secret })
    if (!isValid) {
      return { success: false, error: 'Le code de validation est incorrect' }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    await logAudit(
      'DISABLE_2FA',
      'User',
      session.userId,
      session.userId,
      { message: 'Désactivation de la double authentification (2FA) réussie.' }
    )

    revalidatePath('/settings/security')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur' }
  }
}

// 6. Revoke specific session
export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    const targetSession = await prisma.userSession.findUnique({
      where: { id: sessionId }
    })

    if (!targetSession) {
      return { success: false, error: 'Session introuvable' }
    }

    // Ensure session belongs to current user
    if (targetSession.userId !== session.userId) {
      return { success: false, error: 'Action interdite' }
    }

    await prisma.userSession.delete({
      where: { id: sessionId }
    })

    await logAudit(
      'REVOKE_SESSION',
      'UserSession',
      sessionId,
      session.userId,
      { userAgent: targetSession.userAgent, ipAddress: targetSession.ipAddress }
    )

    // If current session is revoked, user will be logged out on next request.
    // If it's another session, it will disconnect it silently.
    revalidatePath('/settings/security')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 7. Export user personal data to JSON (GDPR)
export async function exportUserDataAction(): Promise<ActionResult<any>> {
  try {
    const session = await requireUserSession()

    // Fetch user and some linked tables to pack the details
    const user = (await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        sessions: {
          select: {
            createdAt: true,
            ipAddress: true,
            userAgent: true
          }
        },
        _count: {
          select: {
            contactsCreated: true,
            contactsUpdated: true,
            tasksAssigned: true
          }
        }
      }
    })) as any

    if (!user) return { success: false, error: 'Utilisateur introuvable' }

    // Build JSON package omitting password / secrets
    const dataPackage = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale,
        timezone: user.timezone,
        theme: user.theme,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      activityMetrics: {
        contactsCreatedCount: user._count.contactsCreated,
        contactsUpdatedCount: user._count.contactsUpdated,
        assignedTasksCount: user._count.tasksAssigned
      },
      sessionsHistory: user.sessions
    }

    await logAudit(
      'EXPORT_PERSONAL_DATA',
      'User',
      session.userId,
      session.userId,
      { message: 'Export complet des données personnelles au format JSON' }
    )

    return { success: true, data: dataPackage }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 8. Anonymize and delete account (GDPR)
export async function anonymizeAccountAction(): Promise<ActionResult> {
  try {
    const session = await requireUserSession()

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!user) return { success: false, error: 'Utilisateur introuvable' }

    // Enforce rule: cannot delete the last Administrator
    if (user.role === 'ADMINISTRATEUR') {
      const adminsCount = await prisma.user.count({
        where: { role: 'ADMINISTRATEUR', archivedAt: null }
      })
      if (adminsCount <= 1) {
        return { success: false, error: 'Impossible de supprimer votre compte : vous êtes le seul administrateur actif de cet espace.' }
      }
    }

    // Log audit before deleting the session & anonymizing
    await logAudit(
      'ANONYMIZE_ACCOUNT',
      'User',
      user.id,
      user.id,
      { message: 'Compte utilisateur anonymisé et désactivé à sa propre demande.' }
    )

    // Anonymize user details (GDPR compliant soft-delete)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: 'Utilisateur',
        lastName: 'Anonymisé',
        email: `deleted-${user.id}@cdc-depute.fr`,
        passwordHash: '', // Wipe password hash
        twoFactorEnabled: false,
        twoFactorSecret: null,
        suspendedAt: new Date(),
        archivedAt: new Date()
      }
    })

    // Wipe all sessions
    await prisma.userSession.deleteMany({
      where: { userId: user.id }
    })

    // Clear cookie
    const cookieStore = await cookies()
    cookieStore.set('session', '', { expires: new Date(0) })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors de l\'anonymisation' }
  }
}
