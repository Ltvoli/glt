import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

// CRON endpoint for automated data retention
// In a real app, you would secure this with an Authorization header check (e.g. comparing to a process.env.CRON_SECRET)
export async function GET(request: Request) {
  try {
    // 1. Authenticate the CRON request if necessary
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret'}` && process.env.NODE_ENV === 'production') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    // 2. Identify records to delete

    // Contacts: Archived more than 3 years ago
    const contactsToDelete = await prisma.contact.findMany({
      where: {
        archivedAt: { lte: threeYearsAgo }
      },
      select: { id: true }
    })
    const contactIds = contactsToDelete.map(c => c.id)

    // Mails: Status 'CLASSE' and updated more than 3 years ago
    const mailsToDelete = await prisma.mailCase.findMany({
      where: {
        status: 'CLASSE',
        updatedAt: { lte: threeYearsAgo }
      },
      select: { id: true }
    })
    const mailIds = mailsToDelete.map(m => m.id)

    let deletedContactsCount = 0
    let deletedMailsCount = 0

    // 3. Execute Deletion
    // Deleting via Prisma will respect onDelete: Cascade defined in schema
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

    // 4. Log the purge operation
    // For automated tasks, userId might be 'SYSTEM' or null if your DB allows, 
    // but logAudit expects a string. We'll use a placeholder 'SYSTEM_CRON'.
    if (deletedContactsCount > 0 || deletedMailsCount > 0) {
      await logAudit('PURGE', 'System', 'DATA_RETENTION', 'SYSTEM_CRON', {
        deletedContacts: deletedContactsCount,
        deletedMails: deletedMailsCount,
        thresholdDate: threeYearsAgo
      })
    }

    return NextResponse.json({
      success: true,
      deletedContacts: deletedContactsCount,
      deletedMails: deletedMailsCount,
      message: 'Purge completed successfully.'
    })

  } catch (error: any) {
    console.error('Error during data retention purge:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
