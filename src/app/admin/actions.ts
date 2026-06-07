'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { validatePasswordStrength } from '@/lib/auth-actions'
import { logAudit } from '@/lib/audit'

async function getAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.isActive || user.archivedAt) throw new Error('Compte inactif')
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') throw new Error('Accès réservé aux administrateurs')
  return user
}

export async function createUser(prevState: any, formData: FormData) {
  try {
    const admin = await getAdminSession()
    
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const role = formData.get('role') as Role
    const password = formData.get('password') as string

    if (!name || !email || !role || !password) return { success: false, error: 'Tous les champs sont requis.' }
    
    if (role === 'SUPERADMIN' && admin.role !== 'SUPERADMIN') {
      return { success: false, error: 'Seul un SUPERADMIN peut créer un compte SUPERADMIN.' }
    }

    const passError = await validatePasswordStrength(password)
    if (passError) return { success: false, error: passError }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return { success: false, error: 'Cet email est déjà utilisé.' }

    const passwordHash = await bcrypt.hash(password, 12)
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        isActive: true
      }
    })

    await logAudit('CREATE', 'User', newUser.id, admin.id, { name, email, role })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}

export async function updateUserRole(userId: string, newRole: Role) {
  try {
    const admin = await getAdminSession()
    
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) return { success: false, error: 'Utilisateur introuvable.' }

    if (targetUser.role === 'SUPERADMIN' && admin.role !== 'SUPERADMIN') {
      return { success: false, error: 'Impossible de modifier un SUPERADMIN.' }
    }
    
    if (newRole === 'SUPERADMIN' && admin.role !== 'SUPERADMIN') {
      return { success: false, error: 'Permissions insuffisantes pour nommer un SUPERADMIN.' }
    }

    if (userId === admin.id && newRole !== admin.role) {
      return { success: false, error: 'Vous ne pouvez pas modifier votre propre rôle ici.' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    await logAudit('UPDATE', 'UserRole', userId, admin.id, { oldRole: targetUser.role, newRole })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}

export async function archiveUser(userId: string) {
  try {
    const admin = await getAdminSession()
    
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) return { success: false, error: 'Utilisateur introuvable.' }

    if (targetUser.role === 'SUPERADMIN' && admin.role !== 'SUPERADMIN') {
      return { success: false, error: 'Impossible d\'archiver un SUPERADMIN.' }
    }

    if (userId === admin.id) {
      return { success: false, error: 'Vous ne pouvez pas vous archiver vous-même.' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        email: `archived_${Date.now()}_${targetUser.email}`,
        role: Role.READONLY,
        isActive: false,
        archivedAt: new Date()
      }
    })

    await logAudit('ARCHIVE', 'User', userId, admin.id, { email: targetUser.email })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}
