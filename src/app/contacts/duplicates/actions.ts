'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { redirect } from 'next/navigation'

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
    return { error: 'Erreur technique' }
  }
}

export async function advancedMergeDuplicate(
  { candidateId, contact1Id, contact2Id, selectedFields }: { candidateId: string, contact1Id: string, contact2Id: string, selectedFields: Record<string, 'c1' | 'c2'> },
  prevState: any,
  formData: FormData
) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  try {
    const candidate = await prisma.duplicateCandidate.findUnique({
      where: { id: candidateId },
      include: { contact1: true, contact2: true }
    })

    if (!candidate || candidate.status !== 'PENDING') return { error: 'Doublon introuvable ou déjà traité' }

    // Build the final merged data
    const finalData: any = {}
    for (const [field, choice] of Object.entries(selectedFields)) {
      finalData[field] = choice === 'c1' ? (candidate.contact1 as any)[field] : (candidate.contact2 as any)[field]
    }

    // We keep contact1 by default as the primary record, and delete contact2
    const keepContactId = contact1Id
    const deleteContactId = contact2Id

    await prisma.$transaction([
      prisma.contact.update({
        where: { id: keepContactId },
        data: finalData
      }),
      // Re-link everything from deleteContactId to keepContactId (Mails, Tasks, QE, Notes)
      // MailCases, Tasks, QEs are linked via GlobalLink
      prisma.globalLink.updateMany({
        where: { contactId: deleteContactId },
        data: { contactId: keepContactId }
      }),
      prisma.contact.update({
        where: { id: deleteContactId },
        data: { archivedAt: new Date() } // Soft delete
      }),
      prisma.duplicateCandidate.update({
        where: { id: candidateId },
        data: { status: 'RESOLVED' }
      })
    ])

    await logAudit('MERGE_DUPLICATE', 'Contact', keepContactId, session.userId, { deletedContactId: deleteContactId, mergedFields: finalData })

  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    return { error: 'Erreur lors de la fusion avancée' }
  }

  revalidatePath('/contacts/duplicates')
  redirect('/contacts/duplicates')
}
