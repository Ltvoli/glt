'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { ActionResult, validatePasswordStrength } from '@/lib/auth-actions'
import { refreshPermissionsCache } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Guard to check if current user is admin/supervisor and return session
async function requireAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Accès refusé')
  }
  return session
}

// 1. Invite a new user
export async function inviteUserAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ inviteLink: string }>> {
  try {
    const session = await requireAdminSession()
    
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const role = formData.get('role') as Role

    if (!email || !role) {
      return { success: false, error: 'Email et rôle requis' }
    }

    // Supervisors cannot invite Administrators
    if (session.dbRole === 'SUPERVISEUR' && role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Permissions insuffisantes pour inviter un Administrateur' }
    }

    // Check if email already in use
    const existingUser = await prisma.user.findFirst({
      where: { email, archivedAt: null }
    })
    if (existingUser) {
      return { success: false, error: 'Cet email est déjà associé à un utilisateur actif' }
    }

    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h expiration

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        invitedById: session.userId
      }
    })

    await logAudit(
      'INVITE_USER',
      'Invitation',
      invitation.id,
      session.userId,
      { email, role, expiresAt }
    )

    revalidatePath('/admin/members')
    
    // In production we would send an email, here we return the link for the UI
    const inviteLink = `/invite/${token}`
    return { success: true, data: { inviteLink } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 2. Resend invitation (renew for 48h)
export async function resendInvitationAction(invitationId: string): Promise<ActionResult<{ inviteLink: string }>> {
  try {
    const session = await requireAdminSession()

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    })

    if (!invitation || invitation.acceptedAt) {
      return { success: false, error: 'Invitation introuvable ou déjà acceptée' }
    }

    if (session.dbRole === 'SUPERVISEUR' && invitation.role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Accès refusé' }
    }

    const newToken = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt,
        createdAt: new Date()
      }
    })

    await logAudit(
      'RESEND_INVITATION',
      'Invitation',
      invitationId,
      session.userId,
      { email: invitation.email, expiresAt }
    )

    revalidatePath('/admin/members')
    return { success: true, data: { inviteLink: `/invite/${newToken}` } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 3. Cancel invitation
export async function cancelInvitationAction(invitationId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    })

    if (!invitation) {
      return { success: false, error: 'Invitation introuvable' }
    }

    if (session.dbRole === 'SUPERVISEUR' && invitation.role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Accès refusé' }
    }

    await prisma.invitation.delete({
      where: { id: invitationId }
    })

    await logAudit(
      'CANCEL_INVITATION',
      'Invitation',
      invitationId,
      session.userId,
      { email: invitation.email }
    )

    revalidatePath('/admin/members')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 4. Update user role
export async function updateUserRoleAction(userId: string, newRole: Role): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (session.userId === userId) {
      return { success: false, error: 'Vous ne pouvez pas modifier votre propre rôle' }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser || targetUser.archivedAt) {
      return { success: false, error: 'Utilisateur introuvable' }
    }

    // Supervisor restrictions
    if (session.dbRole === 'SUPERVISEUR') {
      if (targetUser.role === 'ADMINISTRATEUR' || newRole === 'ADMINISTRATEUR') {
        return { success: false, error: 'Accès refusé' }
      }
    }

    // Enforce last administrator rule
    if (targetUser.role === 'ADMINISTRATEUR' && newRole !== 'ADMINISTRATEUR') {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'ADMINISTRATEUR',
          isActive: true,
          suspendedAt: null,
          archivedAt: null
        }
      })
      if (activeAdminsCount <= 1) {
        return { success: false, error: 'Impossible de rétrograder le dernier Administrateur actif' }
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    // Revoke target user sessions to enforce role change
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })

    await logAudit(
      'UPDATE_USER_ROLE',
      'User',
      userId,
      session.userId,
      { oldRole: targetUser.role, newRole }
    )

    revalidatePath('/admin/members')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 5. Toggle user suspension
export async function toggleUserSuspensionAction(userId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (session.userId === userId) {
      return { success: false, error: 'Vous ne pouvez pas suspendre votre propre compte' }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser || targetUser.archivedAt) {
      return { success: false, error: 'Utilisateur introuvable' }
    }

    // Supervisor restrictions
    if (session.dbRole === 'SUPERVISEUR' && targetUser.role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Accès refusé' }
    }

    const isSuspending = targetUser.suspendedAt === null

    // Enforce last administrator rule
    if (isSuspending && targetUser.role === 'ADMINISTRATEUR') {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'ADMINISTRATEUR',
          isActive: true,
          suspendedAt: null,
          archivedAt: null
        }
      })
      if (activeAdminsCount <= 1) {
        return { success: false, error: 'Impossible de suspendre le dernier Administrateur actif' }
      }
    }

    const suspendedAt = isSuspending ? new Date() : null
    await prisma.user.update({
      where: { id: userId },
      data: { suspendedAt }
    })

    // Revoke sessions if suspending
    if (isSuspending) {
      await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    }

    await logAudit(
      isSuspending ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      'User',
      userId,
      session.userId,
      { email: targetUser.email }
    )

    revalidatePath('/admin/members')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 6. Revoke user (RGPD Soft-delete)
export async function revokeUserAction(userId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (session.userId === userId) {
      return { success: false, error: 'Vous ne pouvez pas révoquer votre propre compte' }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser || targetUser.archivedAt) {
      return { success: false, error: 'Utilisateur introuvable' }
    }

    // Supervisor restrictions
    if (session.dbRole === 'SUPERVISEUR' && targetUser.role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Accès refusé' }
    }

    // Enforce last administrator rule
    if (targetUser.role === 'ADMINISTRATEUR') {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'ADMINISTRATEUR',
          isActive: true,
          suspendedAt: null,
          archivedAt: null
        }
      })
      if (activeAdminsCount <= 1) {
        return { success: false, error: 'Impossible de révoquer le dernier Administrateur actif' }
      }
    }

    // RGPD Soft-delete: Scramble email and archive
    const scrambledEmail = `archived_${Date.now()}_${targetUser.email}`
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: scrambledEmail,
        isActive: false,
        archivedAt: new Date()
      }
    })

    // Revoke all sessions
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })

    await logAudit(
      'REVOKE_USER',
      'User',
      userId,
      session.userId,
      { oldEmail: targetUser.email }
    )

    revalidatePath('/admin/members')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 7. Save Role Permissions Matrix
export async function saveRolePermissionsAction(
  role: Role,
  permissionIds: string[]
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Non authentifié' }

    // ONLY Administrateur can modify role permissions
    if (session.dbRole !== 'ADMINISTRATEUR') {
      return { success: false, error: 'Seul un Administrateur peut modifier la matrice des permissions' }
    }

    // Cannot modify permissions of ADMINISTRATEUR
    if (role === 'ADMINISTRATEUR') {
      return { success: false, error: 'Le rôle Administrateur possède obligatoirement tous les droits' }
    }

    const oldPerms = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true }
    })
    const oldKeys = oldPerms.map(rp => rp.permission.key)

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { role }
    })

    // Insert new ones
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(pId => ({
          role,
          permissionId: pId
        }))
      })
    }

    // Refresh permissions cache immediately
    await refreshPermissionsCache()

    // Log in AuditLog
    await logAudit(
      'UPDATE_ROLE_PERMISSIONS',
      'RolePermission',
      role,
      session.userId,
      { role, permissionsGranted: permissionIds }
    )

    revalidatePath('/admin/members')
    return { success: true }
  } catch (err: any) {
    console.error('Save role permissions error:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 8. Acceptance of invitation (Public)
export async function acceptInvitationAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  const token = formData.get('token') as string
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const password = formData.get('password') as string

  if (!token || !firstName || !lastName || !password) {
    return { success: false, error: 'Tous les champs sont obligatoires' }
  }

  const passError = await validatePasswordStrength(password)
  if (passError) {
    return { success: false, error: passError }
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation || invitation.acceptedAt) {
      return { success: false, error: 'Invitation introuvable ou déjà acceptée' }
    }

    if (new Date() > invitation.expiresAt) {
      return { success: false, error: 'Invitation expirée' }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create User
    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        firstName,
        lastName,
        passwordHash,
        role: invitation.role,
        isActive: true,
        invitedAt: new Date(),
        invitedByUserId: invitation.invitedById
      }
    })

    // Update invitation
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() }
    })

    await logAudit(
      'ACCEPT_INVITATION',
      'User',
      newUser.id,
      newUser.id,
      { email: invitation.email, role: invitation.role }
    )

    return { success: true }
  } catch (err: any) {
    console.error('Accept invitation error:', err)
    return { success: false, error: 'Erreur lors de la création du compte' }
  }
}
