'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/lib/auth-actions'

async function requireAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Accès refusé')
  }
  return session
}

export async function createTagAction(name: string, color: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminSession()
    
    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom du tag est obligatoire' }
    }

    const trimmedName = name.trim()
    const colorHex = color || '#6366f1'

    // Check if tag already exists (case-insensitive check would be good, but unique constraint handles exact)
    const existing = await prisma.tag.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    })

    if (existing) {
      return { success: false, error: 'Un tag avec ce nom existe déjà' }
    }

    const tag = await prisma.tag.create({
      data: {
        name: trimmedName,
        color: colorHex,
        usageCount: 0
      }
    })

    await logAudit(
      'CREATE_TAG',
      'Tag',
      tag.id,
      session.userId,
      tag
    )

    revalidatePath('/admin/tags')
    return { success: true, data: { id: tag.id } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function updateTagAction(id: string, name: string, color: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom du tag est obligatoire' }
    }

    const trimmedName = name.trim()

    const oldTag = await prisma.tag.findUnique({
      where: { id }
    })

    if (!oldTag) {
      return { success: false, error: 'Tag introuvable' }
    }

    // Check uniqueness if name changed
    if (trimmedName.toLowerCase() !== oldTag.name.toLowerCase()) {
      const existing = await prisma.tag.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } }
      })
      if (existing) {
        return { success: false, error: 'Un tag avec ce nom existe déjà' }
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        name: trimmedName,
        color
      }
    })

    await logAudit(
      'UPDATE_TAG',
      'Tag',
      id,
      session.userId,
      { before: oldTag, after: updated }
    )

    revalidatePath('/admin/tags')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const tag = await prisma.tag.findUnique({
      where: { id }
    })

    if (!tag) {
      return { success: false, error: 'Tag introuvable' }
    }

    await prisma.tag.delete({
      where: { id }
    })

    await logAudit(
      'DELETE_TAG',
      'Tag',
      id,
      session.userId,
      { tag }
    )

    revalidatePath('/admin/tags')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function deleteTagsBulkAction(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (!ids || ids.length === 0) {
      return { success: false, error: 'Aucun tag sélectionné' }
    }

    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } }
    })

    await prisma.tag.deleteMany({
      where: { id: { in: ids } }
    })

    await logAudit(
      'BULK_DELETE_TAGS',
      'Tag',
      null,
      session.userId,
      { deletedCount: ids.length, ids, before: tags }
    )

    revalidatePath('/admin/tags')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}
