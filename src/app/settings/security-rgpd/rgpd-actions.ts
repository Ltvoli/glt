'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getRgpdSettings() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: ['RETENTION_INACTIVE_CONTACTS_MONTHS', 'RETENTION_LOGS_DAYS', 'DPO_EMAIL']
      }
    }
  })

  return {
    retentionContacts: settings.find(s => s.key === 'RETENTION_INACTIVE_CONTACTS_MONTHS')?.value || '36',
    retentionLogs: settings.find(s => s.key === 'RETENTION_LOGS_DAYS')?.value || '365',
    dpoEmail: settings.find(s => s.key === 'DPO_EMAIL')?.value || ''
  }
}

export async function updateRgpdSettings(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const retentionContacts = formData.get('retentionContacts') as string
  const retentionLogs = formData.get('retentionLogs') as string
  const dpoEmail = formData.get('dpoEmail') as string

  try {
    const updates = [
      { key: 'RETENTION_INACTIVE_CONTACTS_MONTHS', value: retentionContacts || '36' },
      { key: 'RETENTION_LOGS_DAYS', value: retentionLogs || '365' },
      { key: 'DPO_EMAIL', value: dpoEmail || '' }
    ]

    for (const update of updates) {
      await prisma.appSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value, category: 'SECURITY' }
      })
    }

    await logAudit('UPDATE', 'AppSetting', 'RGPD', session.userId, { updates })

    revalidatePath('/settings/security-rgpd')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la sauvegarde des paramètres RGPD.' }
  }
}
