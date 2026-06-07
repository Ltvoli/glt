'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'

export async function saveAppSetting(key: string, value: string, category: string, label: string) {
  const session = await requireSettingsAccess()
  
  await prisma.appSetting.upsert({
    where: { key },
    update: { value, updatedById: session.userId },
    create: { key, value, category, label, updatedById: session.userId }
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'AppSetting',
      entityId: key,
      newValues: JSON.stringify({ value }),
      userId: session.userId
    }
  })

  revalidatePath('/settings')
  revalidatePath('/')
}

export async function getAppSettings(category?: string) {
  await requireSettingsAccess()
  return await prisma.appSetting.findMany({
    where: category ? { category } : undefined
  })
}
