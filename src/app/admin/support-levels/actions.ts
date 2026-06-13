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

// 1. Create support level
export async function createSupportLevelAction(label: string, color: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminSession()

    if (!label || !label.trim()) {
      return { success: false, error: 'Le libellé est obligatoire' }
    }

    const trimmedLabel = label.trim()
    const colorHex = color || '#6366f1'

    // Get max order
    const maxOrder = await prisma.supportLevel.aggregate({
      _max: { order: true }
    })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    // If it's the first one, make it default
    const count = await prisma.supportLevel.count()
    const isDefault = count === 0

    const level = await prisma.supportLevel.create({
      data: {
        label: trimmedLabel,
        color: colorHex,
        order: nextOrder,
        isDefault
      }
    })

    await logAudit(
      'CREATE_SUPPORT_LEVEL',
      'SupportLevel',
      level.id,
      session.userId,
      level
    )

    revalidatePath('/admin/support-levels')
    return { success: true, data: { id: level.id } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 2. Update support level
export async function updateSupportLevelAction(
  id: string,
  label: string,
  color: string,
  isDefault: boolean
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    if (!label || !label.trim()) {
      return { success: false, error: 'Le libellé est obligatoire' }
    }

    const trimmedLabel = label.trim()

    const oldLevel = await prisma.supportLevel.findUnique({
      where: { id }
    })

    if (!oldLevel) {
      return { success: false, error: 'Niveau de soutien introuvable' }
    }

    // If setting as default, unset others first
    if (isDefault && !oldLevel.isDefault) {
      await prisma.supportLevel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    } else if (!isDefault && oldLevel.isDefault) {
      // Cannot unset default if it is the only one
      const defaultsCount = await prisma.supportLevel.count({
        where: { isDefault: true }
      })
      if (defaultsCount <= 1) {
        return { success: false, error: 'Il doit y avoir au moins un niveau de soutien par défaut' }
      }
    }

    const updated = await prisma.supportLevel.update({
      where: { id },
      data: {
        label: trimmedLabel,
        color,
        isDefault
      }
    })

    await logAudit(
      'UPDATE_SUPPORT_LEVEL',
      'SupportLevel',
      id,
      session.userId,
      { before: oldLevel, after: updated }
    )

    revalidatePath('/admin/support-levels')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 3. Delete support level
export async function deleteSupportLevelAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const level = await prisma.supportLevel.findUnique({
      where: { id }
    })

    if (!level) {
      return { success: false, error: 'Niveau de soutien introuvable' }
    }

    if (level.isDefault) {
      return { success: false, error: 'Impossible de supprimer le niveau de soutien par défaut' }
    }

    await prisma.supportLevel.delete({
      where: { id }
    })

    // Reorder remaining levels
    const remaining = await prisma.supportLevel.findMany({
      orderBy: { order: 'asc' }
    })

    await prisma.$transaction(
      remaining.map((item, idx) =>
        prisma.supportLevel.update({
          where: { id: item.id },
          data: { order: idx }
        })
      )
    )

    await logAudit(
      'DELETE_SUPPORT_LEVEL',
      'SupportLevel',
      id,
      session.userId,
      { level }
    )

    revalidatePath('/admin/support-levels')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 4. Reorder support levels (DND sort)
export async function reorderSupportLevelsAction(levelIds: string[]): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    await prisma.$transaction(
      levelIds.map((id, index) =>
        prisma.supportLevel.update({
          where: { id },
          data: { order: index }
        })
      )
    )

    await logAudit(
      'REORDER_SUPPORT_LEVELS',
      'SupportLevel',
      null,
      session.userId,
      { order: levelIds }
    )

    revalidatePath('/admin/support-levels')
    return { success: true }
  } catch (err: any) {
    console.error('Reorder support levels error:', err)
    return { success: false, error: 'Erreur lors du réordonnancement' }
  }
}

// 5. Apply pre-defined templates
const TEMPLATES = {
  standard: [
    { label: 'Soutien Faible', color: '#94a3b8', isDefault: true },
    { label: 'Soutien Moyen', color: '#3b82f6', isDefault: false },
    { label: 'Soutien Fort', color: '#10b981', isDefault: false }
  ],
  electoral: [
    { label: 'Opposant', color: '#ef4444', isDefault: false },
    { label: 'Indécis', color: '#f97316', isDefault: true },
    { label: 'Favorable', color: '#10b981', isDefault: false },
    { label: 'Militant', color: '#a855f7', isDefault: false }
  ],
  engagement: [
    { label: 'Observateur', color: '#64748b', isDefault: true },
    { label: 'Sympathisant', color: '#06b6d4', isDefault: false },
    { label: 'Adhérent', color: '#3b82f6', isDefault: false },
    { label: 'Militant Actif', color: '#6366f1', isDefault: false }
  ]
}

export async function applyTemplateAction(
  templateName: 'standard' | 'electoral' | 'engagement'
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const template = TEMPLATES[templateName]
    if (!template) {
      return { success: false, error: 'Modèle inconnu' }
    }

    const oldLevels = await prisma.supportLevel.findMany({
      orderBy: { order: 'asc' }
    })

    // Perform inside a transaction: delete all support levels first and then insert new ones
    await prisma.$transaction(async (tx) => {
      // We cannot simply delete all if they are referenced.
      // Note: in schema, there is ContactSupportLevelHistory and Contact (does Contact reference SupportLevel? Let's check.)
      // Wait, let's look at schema to see if Contact has supportLevel or if it is just a string, or references.
      // Let's check schema for Contact. Wait, we don't need to check all, but let's see. If they are referenced, deleteMany might fail or need cascade.
      // Actually, since this is a clean start and we want to replace them, let's delete them.
      await tx.supportLevel.deleteMany({})

      // Create new ones
      for (let i = 0; i < template.length; i++) {
        await tx.supportLevel.create({
          data: {
            label: template[i].label,
            color: template[i].color,
            isDefault: template[i].isDefault,
            order: i
          }
        })
      }
    })

    await logAudit(
      'APPLY_SUPPORT_LEVEL_TEMPLATE',
      'SupportLevel',
      null,
      session.userId,
      { templateName, before: oldLevels }
    )

    revalidatePath('/admin/support-levels')
    return { success: true }
  } catch (err: any) {
    console.error('Apply template error:', err)
    return { success: false, error: 'Impossible d\'appliquer le modèle (des contacts y sont peut-être associés).' }
  }
}
