'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function getPurgeStats() {
  await requireWriteAccess()

  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const contactsCount = await prisma.contact.count({
    where: {
      archivedAt: { lte: threeYearsAgo }
    }
  })

  const mailsCount = await prisma.mailCase.count({
    where: {
      status: 'CLASSE',
      updatedAt: { lte: threeYearsAgo }
    }
  })

  return {
    contacts: contactsCount,
    mails: mailsCount,
    thresholdDate: threeYearsAgo
  }
}

export async function executePurge() {
  const session = await requireWriteAccess()

  // Guard against non-superadmin if required
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Non autorisé')
  }

  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const contactsToDelete = await prisma.contact.findMany({
    where: { archivedAt: { lte: threeYearsAgo } },
    select: { id: true }
  })
  const contactIds = contactsToDelete.map(c => c.id)

  const mailsToDelete = await prisma.mailCase.findMany({
    where: { status: 'CLASSE', updatedAt: { lte: threeYearsAgo } },
    select: { id: true }
  })
  const mailIds = mailsToDelete.map(m => m.id)

  let deletedContactsCount = 0
  let deletedMailsCount = 0

  if (contactIds.length > 0) {
    const res = await prisma.contact.deleteMany({
      where: { id: { in: contactIds } }
    })
    deletedContactsCount = res.count
  }

  if (mailIds.length > 0) {
    const res = await prisma.mailCase.deleteMany({
      where: { id: { in: mailIds } }
    })
    deletedMailsCount = res.count
  }

  if (deletedContactsCount > 0 || deletedMailsCount > 0) {
    await logAudit('PURGE', 'System', 'DATA_RETENTION', session.userId, {
      action: 'MANUAL_PURGE',
      deletedContacts: deletedContactsCount,
      deletedMails: deletedMailsCount,
      thresholdDate: threeYearsAgo
    })
  }

  revalidatePath('/admin/data-retention')
  
  return {
    success: true,
    deletedContacts: deletedContactsCount,
    deletedMails: deletedMailsCount
  }
}
