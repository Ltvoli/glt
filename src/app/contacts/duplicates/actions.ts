'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function dismissDuplicate(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const candidateId = formData.get('candidateId') as string
  if (!candidateId) return { error: 'ID introuvable' }

  try {
    await prisma.duplicateCandidate.update({
      where: { id: candidateId },
      data: { status: 'RESOLVED' }
    })
    revalidatePath('/contacts/duplicates')
    return { success: true }
  } catch (e) {
    return { error: 'Erreur lors de la mise à jour.' }
  }
}

export async function mergeDuplicate(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const candidateId = formData.get('candidateId') as string
  const keepContactId = formData.get('keepContactId') as string
  const deleteContactId = formData.get('deleteContactId') as string

  if (!candidateId || !keepContactId || !deleteContactId) return { error: 'Données manquantes' }

  try {
    // Dans une vraie app complexe, on devrait fusionner les tâches, courriers, tags, etc.
    // Pour simplifier ici, on archive simplement le contact "supprimé" et on résout le candidat.
    
    await prisma.$transaction([
      prisma.contact.update({
        where: { id: deleteContactId },
        data: { archivedAt: new Date() }
      }),
      prisma.duplicateCandidate.update({
        where: { id: candidateId },
        data: { status: 'RESOLVED' }
      })
    ])

    await logAudit('MERGE_DUPLICATE', 'Contact', keepContactId, session.userId, { deletedContactId: deleteContactId })

    revalidatePath('/contacts/duplicates')
    return { success: true }
  } catch (e) {
    return { error: 'Erreur lors de la fusion.' }
  }
}
