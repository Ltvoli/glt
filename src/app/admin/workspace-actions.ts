'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/lib/auth-actions'

export async function saveWorkspaceSettings(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession()
  if (!session?.userId) {
    return { success: false, error: 'Non authentifié' }
  }

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    return { success: false, error: 'Accès refusé' }
  }

  const name = formData.get('name') as string
  const force2FA = formData.get('force2FA') === 'on'
  const mobileAccessEnabled = formData.get('mobileAccessEnabled') === 'on'
  const sessionTimeoutMinutes = parseInt(formData.get('sessionTimeoutMinutes') as string, 10) || 1440
  const ipAllowlist = (formData.get('ipAllowlist') as string)?.trim() || null

  if (!name) {
    return { success: false, error: 'Le nom de l\'espace est requis' }
  }

  try {
    const oldSettings = await prisma.workspaceSettings.findUnique({
      where: { id: 'singleton' }
    })

    const updated = await prisma.workspaceSettings.upsert({
      where: { id: 'singleton' },
      update: {
        name,
        force2FA,
        mobileAccessEnabled,
        sessionTimeoutMinutes,
        ipAllowlist
      },
      create: {
        id: 'singleton',
        name,
        force2FA,
        mobileAccessEnabled,
        sessionTimeoutMinutes,
        ipAllowlist
      }
    })

    await logAudit(
      'UPDATE_WORKSPACE_SETTINGS',
      'WorkspaceSettings',
      'singleton',
      session.userId,
      { before: oldSettings, after: updated }
    )

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    console.error('Save workspace settings error:', err)
    return { success: false, error: 'Erreur lors de la sauvegarde' }
  }
}
