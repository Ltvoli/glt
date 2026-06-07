'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

import { Role } from '@prisma/client'

export async function getUsers() {
  await requireSettingsAccess()
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { name: 'asc' }
  })
}

export async function updateUserRole(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()
  const targetUserId = formData.get('userId') as string
  const newRole = formData.get('role') as Role
  
  if (!targetUserId || !newRole) return { error: 'Paramètres invalides.' }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return { error: 'Utilisateur introuvable.' }

    // Règle 1 : On ne peut pas modifier son propre rôle (anti-suicide)
    if (targetUserId === session.userId) {
      return { error: 'Vous ne pouvez pas modifier votre propre rôle.' }
    }

    // Règle 2 : Seul un SUPERADMIN peut promouvoir ou rétrograder un SUPERADMIN
    if (targetUser.role === 'SUPERADMIN' && session.role !== 'SUPERADMIN') {
      return { error: 'Permissions insuffisantes pour modifier un SUPERADMIN.' }
    }
    
    if (newRole === 'SUPERADMIN' && session.role !== 'SUPERADMIN') {
      return { error: 'Seul un SUPERADMIN peut nommer un autre SUPERADMIN.' }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole }
    })

    await logAudit('UPDATE', 'UserRole', targetUserId, session.userId, { oldRole: targetUser.role, newRole })

    revalidatePath('/settings/users-roles')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la mise à jour du rôle.' }
  }
}
