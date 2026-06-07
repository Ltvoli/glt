'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getAutomations() {
  await requireSettingsAccess()
  
  // Seed initial rules if empty
  const count = await prisma.automationRule.count()
  if (count === 0) {
    await prisma.automationRule.createMany({
      data: [
        { name: "Rappel automatique des tâches échues", frequency: "0 9 * * *", description: "Envoi des rappels", isActive: true },
        { name: "Tag 'Inactif' après 36 mois sans interaction (RGPD)", frequency: "0 0 * * 0", description: "RGPD Inactif", isActive: true },
        { name: "Notification aux élus lors d'une nouvelle QE", frequency: "ON_QE_CREATED", description: "Notif", isActive: false }
      ]
    })
  }

  return await prisma.automationRule.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function toggleAutomation(id: string, isActive: boolean) {
  const session = await requireSettingsAccess()

  try {
    const updated = await prisma.automationRule.update({
      where: { id },
      data: { isActive }
    })

    await logAudit('UPDATE', 'AutomationRule', updated.name, session.userId, { isActive })

    revalidatePath('/settings/automations')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la modification de la règle.' }
  }
}
