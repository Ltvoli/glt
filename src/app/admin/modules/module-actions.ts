'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

async function getSuperAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || user.role !== 'SUPERADMIN') throw new Error('Accès réservé au SuperAdmin')
  return user
}

export async function toggleModuleStatus(moduleId: string, isActive: boolean) {
  try {
    const admin = await getSuperAdminSession()
    
    const targetModule = await prisma.module.findUnique({ where: { id: moduleId } })
    if (!targetModule) return { success: false, error: 'Module introuvable.' }

    await prisma.module.update({
      where: { id: moduleId },
      data: { isActive }
    })

    await logAudit('UPDATE', 'Module', moduleId, admin.id, { 
      moduleLabel: targetModule.label, 
      isActive 
    })

    revalidatePath('/admin/modules')
    revalidatePath('/', 'layout') // revalidate the whole app layout since sidebar depends on it
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}
