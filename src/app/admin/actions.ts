'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

async function checkSuperAdmin() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (user?.role !== 'SUPERADMIN') throw new Error('Accès réservé au SuperAdmin')
  return session.userId
}

function validatePassword(password: string) {
  if (password.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.')
  // Further complexity could be checked here (regex for numbers, etc.)
}

export async function createUser(data: { name: string, email: string, role: string, passwordHash: string }) {
  await checkSuperAdmin()
  validatePassword(data.passwordHash)
  const passwordHash = await bcrypt.hash(data.passwordHash, 12)
  
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash
    }
  })
  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, role: string) {
  await checkSuperAdmin()
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  })
  revalidatePath('/admin/users')
}

export async function resetUserPassword(userId: string, newPasswordPlain: string) {
  await checkSuperAdmin()
  validatePassword(newPasswordPlain)
  const passwordHash = await bcrypt.hash(newPasswordPlain, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  })
  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await checkSuperAdmin()
  
  // Note: in a real SaaS, we would do a soft delete or reassign data.
  // Here we will prepend 'archived_' to email and change role to READONLY to preserve integrity.
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user) {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        email: `archived_${Date.now()}_${user.email}`,
        role: 'READONLY'
      }
    })
  }
  revalidatePath('/admin/users')
}
