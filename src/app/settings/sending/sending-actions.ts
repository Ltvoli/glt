'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getSendingSettings() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: ['DEFAULT_SENDER_NAME', 'DEFAULT_SENDER_EMAIL', 'DAILY_EMAIL_QUOTA', 'DAILY_SMS_QUOTA']
      }
    }
  })

  return {
    senderName: settings.find(s => s.key === 'DEFAULT_SENDER_NAME')?.value || 'Lionel Tivoli',
    senderEmail: settings.find(s => s.key === 'DEFAULT_SENDER_EMAIL')?.value || 'contact@lionel-tivoli.fr',
    emailQuota: settings.find(s => s.key === 'DAILY_EMAIL_QUOTA')?.value || '1000',
    smsQuota: settings.find(s => s.key === 'DAILY_SMS_QUOTA')?.value || '200'
  }
}

export async function updateSendingSettings(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const senderName = formData.get('senderName') as string
  const senderEmail = formData.get('senderEmail') as string
  const emailQuota = formData.get('emailQuota') as string
  const smsQuota = formData.get('smsQuota') as string

  try {
    const updates = [
      { key: 'DEFAULT_SENDER_NAME', value: senderName || 'Lionel Tivoli' },
      { key: 'DEFAULT_SENDER_EMAIL', value: senderEmail || 'contact@lionel-tivoli.fr' },
      { key: 'DAILY_EMAIL_QUOTA', value: emailQuota || '1000' },
      { key: 'DAILY_SMS_QUOTA', value: smsQuota || '200' }
    ]

    for (const update of updates) {
      await prisma.appSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value, category: 'SENDING' }
      })
    }

    await logAudit('UPDATE', 'AppSetting', 'SENDING', session.userId, { updates })

    revalidatePath('/settings/sending')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la sauvegarde des paramètres d\'envoi.' }
  }
}
