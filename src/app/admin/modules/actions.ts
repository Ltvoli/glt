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

// 1. Toggle module status (isActive or showInSidebar)
export async function toggleModuleAction(
  moduleId: string,
  field: 'isActive' | 'showInSidebar',
  value: boolean
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const oldModule = await prisma.module.findUnique({
      where: { id: moduleId }
    })

    if (!oldModule) {
      return { success: false, error: 'Module introuvable' }
    }

    const updated = await prisma.module.update({
      where: { id: moduleId },
      data: { [field]: value }
    })

    await logAudit(
      'TOGGLE_MODULE',
      'Module',
      moduleId,
      session.userId,
      { field, value, key: oldModule.key, before: oldModule.isActive }
    )

    revalidatePath('/admin/modules')
    revalidatePath('/') // Sidebar is global
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 2. Update single page details
export async function updatePageAction(
  pageId: string,
  data: { label: string; slug: string; isVisible: boolean; permission: string | null }
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    const oldPage = await prisma.page.findUnique({
      where: { id: pageId }
    })

    if (!oldPage) {
      return { success: false, error: 'Page introuvable' }
    }

    const updated = await prisma.page.update({
      where: { id: pageId },
      data: {
        label: data.label,
        slug: data.slug,
        isVisible: data.isVisible,
        permission: data.permission || null
      }
    })

    await logAudit(
      'UPDATE_PAGE',
      'Page',
      pageId,
      session.userId,
      { before: oldPage, after: updated }
    )

    revalidatePath('/admin/modules')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// 3. Reorder pages (DND sort)
export async function reorderPagesAction(pageIds: string[]): Promise<ActionResult> {
  try {
    const session = await requireAdminSession()

    // Perform database updates in a transaction
    await prisma.$transaction(
      pageIds.map((id, index) =>
        prisma.page.update({
          where: { id },
          data: { order: index }
        })
      )
    )

    await logAudit(
      'REORDER_PAGES',
      'Page',
      null,
      session.userId,
      { pageOrder: pageIds }
    )

    revalidatePath('/admin/modules')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Reorder pages error:', err)
    return { success: false, error: 'Erreur lors de la réorganisation' }
  }
}

// 4. Save system settings by category
export async function saveSystemSettingsAction(
  category: string,
  settingsMap: Record<string, string>
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.userId) return { success: false, error: 'Non authentifié' }

    // ONLY Administrateur can modify system settings
    if (session.dbRole !== 'ADMINISTRATEUR') {
      return { success: false, error: 'Seul un Administrateur peut modifier les paramètres système' }
    }

    for (const [key, value] of Object.entries(settingsMap)) {
      const setting = await prisma.setting.findUnique({
        where: { key }
      })

      if (!setting) continue

      // Handle sensitive fields (SECRET) - if submitted empty or as placeholder, ignore
      if (setting.type === 'SECRET' && (!value || value === '••••••••••••')) {
        continue
      }

      // Type validations
      if (setting.type === 'NUMBER') {
        const num = Number(value)
        if (isNaN(num)) {
          return { success: false, error: `La valeur pour ${setting.label || key} doit être un nombre valide.` }
        }
      }

      if (setting.type === 'JSON') {
        try {
          JSON.parse(value)
        } catch (e) {
          return { success: false, error: `La valeur pour ${setting.label || key} doit être du JSON valide.` }
        }
      }

      // Update value in DB
      await prisma.setting.update({
        where: { key },
        data: { value }
      })

      await logAudit(
        'UPDATE_SYSTEM_SETTING',
        'Setting',
        key,
        session.userId,
        { 
          value: setting.type === 'SECRET' ? '••••••••' : value,
          before: setting.type === 'SECRET' ? '••••••••' : setting.value
        }
      )
    }

    revalidatePath('/admin/modules')
    return { success: true }
  } catch (err: any) {
    console.error('Save system settings error:', err)
    return { success: false, error: 'Erreur lors de l\'enregistrement' }
  }
}
