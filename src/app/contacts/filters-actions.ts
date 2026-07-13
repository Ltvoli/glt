'use server'

import prisma from '@/lib/prisma'
import { getSession, requireWriteAccess } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createSavedFilter(
  name: string,
  description: string | null | undefined,
  payload: string,
  isShared: boolean = false
): Promise<{ success: boolean; error?: string; filterId?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom du filtre est obligatoire.' }
    }

    const trimmedName = name.trim()

    // Vérifier si un filtre avec ce nom existe déjà pour cet utilisateur
    const existing = await prisma.savedFilter.findFirst({
      where: {
        userId: session.userId,
        name: trimmedName
      }
    })

    if (existing) {
      return { success: false, error: 'Vous avez déjà un filtre enregistré avec ce nom.' }
    }

    const newFilter = await prisma.savedFilter.create({
      data: {
        name: trimmedName,
        description: description || null,
        payload,
        isShared,
        userId: session.userId
      }
    })

    await logAudit(
      'CREATE_SAVED_FILTER',
      'SavedFilter',
      newFilter.id,
      session.userId,
      { name: trimmedName, isShared }
    )

    revalidatePath('/contacts')
    return { success: true, filterId: newFilter.id }
  } catch (err: any) {
    console.error('Error creating saved filter:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function getSavedFilters(): Promise<any[]> {
  try {
    const session = await getSession()
    if (!session?.userId) return []

    return await prisma.savedFilter.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { isShared: true }
        ]
      },
      orderBy: { name: 'asc' },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    })
  } catch (err) {
    console.error('Error fetching saved filters:', err)
    return []
  }
}

export async function deleteSavedFilter(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!id) {
      return { success: false, error: 'Identifiant du filtre manquant.' }
    }

    // Récupérer le filtre pour vérifier les permissions de suppression
    const filter = await prisma.savedFilter.findUnique({
      where: { id }
    })

    if (!filter) {
      return { success: false, error: 'Filtre introuvable.' }
    }

    // Seul le propriétaire ou un administrateur peut supprimer
    const isOwner = filter.userId === session.userId
    const isAdmin = session.role === 'ADMIN' || session.role === 'SUPERADMIN'

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Vous n\'avez pas la permission de supprimer ce filtre.' }
    }

    await prisma.savedFilter.delete({
      where: { id }
    })

    await logAudit(
      'DELETE_SAVED_FILTER',
      'SavedFilter',
      id,
      session.userId,
      { name: filter.name }
    )

    revalidatePath('/contacts')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting saved filter:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}
