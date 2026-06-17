'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Accès refusé')
  }
  return session
}

export async function purgeLogsAction(olderThanDays: number) {
  await requireAdmin()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  await prisma.appLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  revalidatePath('/admin/logs')
}
