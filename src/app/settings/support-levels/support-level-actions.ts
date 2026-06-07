'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function isSupportLevelEnabled() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: 'SUPPORT_LEVEL_ENABLED' }
  })
  return setting ? setting.value === 'true' : true // Activé par défaut
}

export async function toggleSupportLevel(enabled: boolean) {
  const session = await requireSettingsAccess()

  // Seul un ADMIN ou SUPERADMIN devrait faire ça (déjà garanti par requireSettingsAccess)

  const updated = await prisma.appSetting.upsert({
    where: { key: 'SUPPORT_LEVEL_ENABLED' },
    update: { value: enabled ? 'true' : 'false' },
    create: { key: 'SUPPORT_LEVEL_ENABLED', value: enabled ? 'true' : 'false', category: 'SUPPORT' }
  })

  await logAudit('UPDATE', 'AppSetting', updated.id, session.userId, { key: 'SUPPORT_LEVEL_ENABLED', enabled })

  revalidatePath('/settings/support-levels')
  revalidatePath('/contacts')
  // revalidatePath pour les autres routes où le niveau est affiché

  return { success: true }
}
