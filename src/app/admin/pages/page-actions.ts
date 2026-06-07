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

export async function reorderPages(updates: { id: string, order: number }[]) {
  try {
    const admin = await getSuperAdminSession()

    // Using transaction to perform all updates
    await prisma.$transaction(
      updates.map(update => 
        prisma.page.update({
          where: { id: update.id },
          data: { order: update.order }
        })
      )
    )

    await logAudit('REORDER', 'Page', 'bulk', admin.id, { count: updates.length })

    revalidatePath('/admin/pages')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}

export async function togglePageStatus(pageId: string, isVisible: boolean) {
  try {
    const admin = await getSuperAdminSession()
    
    await prisma.page.update({
      where: { id: pageId },
      data: { isVisible }
    })

    await logAudit('UPDATE', 'Page', pageId, admin.id, { isVisible })

    revalidatePath('/admin/pages')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}
