'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getModules() {
  await requireSettingsAccess()
  
  const defaultModules = ['CONTACTS', 'TASKS', 'MAILS', 'QE', 'PLANNING']
  
  for (const mod of defaultModules) {
    await prisma.moduleSetting.upsert({
      where: { moduleName: mod },
      update: {},
      create: { 
        moduleName: mod, 
        displayName: mod, 
        isActive: true,
        visibleRoles: '["ADMIN", "SUPERADMIN", "USER", "READONLY"]' 
      }
    })
  }

  return await prisma.moduleSetting.findMany({
    orderBy: { moduleName: 'asc' }
  })
}

export async function toggleModule(moduleId: string, isActive: boolean) {
  const session = await requireSettingsAccess()

  try {
    const updated = await prisma.moduleSetting.update({
      where: { id: moduleId },
      data: { isActive }
    })

    await logAudit('UPDATE', 'ModuleSetting', updated.moduleName, session.userId, { isActive })

    revalidatePath('/')
    revalidatePath('/settings/modules')
    
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la modification du module.' }
  }
}
