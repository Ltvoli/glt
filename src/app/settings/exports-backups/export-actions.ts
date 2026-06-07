'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'

export async function getExportLogs() {
  await requireSettingsAccess()
  
  return await prisma.exportBackupLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  })
}

export async function requestManualBackup() {
  const session = await requireSettingsAccess()

  try {
    // Simulation d'une création de backup
    await prisma.exportBackupLog.create({
      data: {
        type: 'BACKUP_DB',
        status: 'SUCCESS',
        userId: session.userId,
        details: JSON.stringify({ fileUrl: '/api/downloads/backup-db-' + Date.now() + '.sql' })
      }
    })

    revalidatePath('/settings/exports-backups')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la demande de sauvegarde.' }
  }
}
