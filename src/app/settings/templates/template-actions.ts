'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getTemplates() {
  await requireSettingsAccess()
  return await prisma.messageTemplate.findMany({
    orderBy: { channel: 'asc' }
  })
}

export async function saveTemplate(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const subject = formData.get('subject') as string
  const content = formData.get('content') as string
  
  if (!name || !type || !content) return { error: 'Le nom, le type et le contenu sont requis.' }

  try {
    let savedTemplate
      if (id) {
        // Update
        savedTemplate = await prisma.messageTemplate.update({
          where: { id },
          data: { name, channel: type, subject: subject || null, content }
        })
      await logAudit('UPDATE', 'MessageTemplate', savedTemplate.id, session.userId, savedTemplate)
      } else {
        // Create
        savedTemplate = await prisma.messageTemplate.create({
          data: { name, channel: type, subject: subject || null, content, variables: '[]', authorId: session.userId }
        })
      await logAudit('CREATE', 'MessageTemplate', savedTemplate.id, session.userId, savedTemplate)
    }

    revalidatePath('/settings/templates')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la sauvegarde du modèle (le nom est peut-être déjà utilisé).' }
  }
}

export async function deleteTemplate(id: string) {
  const session = await requireSettingsAccess()

  try {
    const deleted = await prisma.messageTemplate.delete({ where: { id } })
    await logAudit('DELETE', 'MessageTemplate', id, session.userId, deleted)
    revalidatePath('/settings/templates')
    return { success: true }
  } catch (error) {
    return { error: 'Impossible de supprimer ce modèle.' }
  }
}
