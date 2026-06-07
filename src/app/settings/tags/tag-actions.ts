'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getGlobalTags() {
  await requireSettingsAccess()
  return await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { contacts: true, tasks: true }
      }
    }
  })
}

export async function createTag(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const name = formData.get('name') as string
  const color = formData.get('color') as string
  
  if (!name) return { error: 'Le nom du tag est requis.' }

  try {
    const existing = await prisma.tag.findUnique({ where: { name } })
    if (existing) return { error: 'Ce tag existe déjà.' }

    const tag = await prisma.tag.create({
      data: { name, color: color || '#e2e8f0' }
    })

    await logAudit('CREATE', 'Tag', tag.id, session.userId, tag)

    revalidatePath('/settings/tags')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la création du tag.' }
  }
}

export async function updateTag(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const color = formData.get('color') as string
  
  if (!id || !name) return { error: 'ID et nom requis.' }

  try {
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: { name, color: color || '#e2e8f0' }
    })

    await logAudit('UPDATE', 'Tag', id, session.userId, updatedTag)

    revalidatePath('/settings/tags')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la mise à jour (nom peut-être déjà pris).' }
  }
}

export async function deleteTag(id: string) {
  const session = await requireSettingsAccess()

  try {
    const deleted = await prisma.tag.delete({ where: { id } })
    await logAudit('DELETE', 'Tag', id, session.userId, deleted)
    revalidatePath('/settings/tags')
    return { success: true }
  } catch (error) {
    return { error: 'Impossible de supprimer ce tag car il est peut-être en cours d\'utilisation.' }
  }
}
