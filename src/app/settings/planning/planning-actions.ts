'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getPlanningSettings() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: ['TOTAL_CP', 'TOTAL_RTT']
      }
    }
  })

  return {
    totalCP: settings.find(s => s.key === 'TOTAL_CP')?.value || '25',
    totalRTT: settings.find(s => s.key === 'TOTAL_RTT')?.value || '12'
  }
}

export async function updatePlanningSettings(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const totalCP = formData.get('totalCP') as string
  const totalRTT = formData.get('totalRTT') as string

  try {
    const updates = [
      { key: 'TOTAL_CP', value: totalCP || '25' },
      { key: 'TOTAL_RTT', value: totalRTT || '12' }
    ]

    for (const update of updates) {
      await prisma.appSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value, category: 'PLANNING' }
      })
    }

    await logAudit('UPDATE', 'AppSetting', 'PLANNING', session.userId, { updates })

    revalidatePath('/settings/planning')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la sauvegarde des paramètres du planning.' }
  }
}
