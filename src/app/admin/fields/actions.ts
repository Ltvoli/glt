'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'

async function requireAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Accès refusé')
  }
  return session
}

export type FieldConfigInput = {
  id: string
  module: string
  section: string | null
  fieldKey: string
  defaultLabel: string
  customLabel: string | null
  isVisible: boolean
  order: number
}

// Ensure defaults exist for a given module
export async function initializeModuleFieldsAction(moduleKey: string, defaultFields: Omit<FieldConfigInput, 'id'>[]) {
  try {
    await requireAdminSession()
    
    for (const field of defaultFields) {
      await prisma.fieldConfig.upsert({
        where: {
          module_fieldKey: { module: field.module, fieldKey: field.fieldKey }
        },
        update: {}, // Only create if not exists
        create: {
          module: field.module,
          section: field.section,
          fieldKey: field.fieldKey,
          defaultLabel: field.defaultLabel,
          customLabel: field.customLabel,
          isVisible: field.isVisible,
          order: field.order
        }
      })
    }
    
    revalidatePath('/admin/fields')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Update multiple fields at once (e.g., after reordering or editing labels)
export async function updateFieldsAction(updates: { id: string; customLabel: string | null; isVisible: boolean; order: number }[]) {
  try {
    const session = await requireAdminSession()

    // Using a transaction for bulk updates
    await prisma.$transaction(
      updates.map(update => prisma.fieldConfig.update({
        where: { id: update.id },
        data: {
          customLabel: update.customLabel,
          isVisible: update.isVisible,
          order: update.order
        }
      }))
    )

    await logAudit('UPDATE_FIELDS', 'FieldConfig', 'bulk', session.userId, { count: updates.length })
    revalidatePath('/admin/fields')
    revalidatePath('/') // Revalidate everything so forms pick up changes
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
