'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getSystemLists(category: string) {
  await requireSettingsAccess()
  return await prisma.systemList.findMany({
    where: { category },
    orderBy: { order: 'asc' }
  })
}

export async function createSystemList(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await requireSettingsAccess()

  const category = formData.get('category') as string
  const value = formData.get('value') as string
  const color = formData.get('color') as string
  const orderStr = formData.get('order') as string
  
  if (!category || !value) {
    return { error: 'La catégorie et la valeur sont requises.' }
  }

  try {
    const existing = await prisma.systemList.findFirst({
      where: { category, value: { equals: value, mode: 'insensitive' } }
    })
    
    if (existing) {
      return { error: 'Cette valeur existe déjà pour cette catégorie.' }
    }

    const newItem = await prisma.systemList.create({
      data: {
        category,
        value,
        color: color || null,
        order: orderStr ? parseInt(orderStr) : 0,
      }
    })

    await logAudit('CREATE', 'SystemList', newItem.id, session.userId, newItem)

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la création de la liste.' }
  }
}

export async function updateSystemList(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await requireSettingsAccess()

  const id = formData.get('id') as string
  const value = formData.get('value') as string
  const color = formData.get('color') as string
  const isActive = formData.get('isActive') === 'true'
  const orderStr = formData.get('order') as string
  
  if (!id || !value) {
    return { error: 'ID et valeur requis.' }
  }

  try {
    const updatedItem = await prisma.systemList.update({
      where: { id },
      data: {
        value,
        color: color || null,
        isActive,
        order: orderStr ? parseInt(orderStr) : 0,
      }
    })

    await logAudit('UPDATE', 'SystemList', updatedItem.id, session.userId, updatedItem)

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la mise à jour de la liste.' }
  }
}

export async function deleteSystemList(id: string): Promise<{ error?: string, success?: boolean }> {
  const session = await requireSettingsAccess()

  try {
    // Au lieu de supprimer définitivement, on pourrait faire un soft delete,
    // mais pour une SystemList qu'on vient de créer par erreur, c'est parfois utile.
    // L'UI forcera plutôt la désactivation (isActive = false).
    const deleted = await prisma.systemList.delete({ where: { id } })
    
    await logAudit('DELETE', 'SystemList', id, session.userId, deleted)
    
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la suppression. Cette valeur est peut-être utilisée.' }
  }
}
