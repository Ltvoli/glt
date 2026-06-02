import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter')
  
  const whereClause: any = {}
  
  if (filter === 'mine') {
    whereClause.assigneeId = session?.userId
  } else if (filter === 'urgent') {
    whereClause.urgency = 'HAUTE'
    whereClause.status = { notIn: ['REPONDU', 'CLASSE'] }
  } else if (filter === 'pending') {
    whereClause.status = { in: ['RECU', 'LU', 'EN_TRAITEMENT'] }
  } else if (filter === 'entrant') {
    whereClause.type = 'ENTRANT'
  } else if (filter === 'sortant') {
    whereClause.type = 'SORTANT'
  } else if (filter === 'late') {
    whereClause.responseDueDate = { lt: new Date() }
    whereClause.status = { notIn: ['REPONDU', 'CLASSE'] }
  }

  const mails = await prisma.mailCase.findMany({
    where: whereClause,
    include: {
      assignee: { select: { name: true } },
      links: {
        include: {
          contact: { select: { firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { receiveDate: 'desc' },
  })

  const csvRows = []
  // En-têtes
  csvRows.push(['Référence', 'Type', 'Date Réception', 'Date Envoi', 'Sujet', 'Canal', 'Expéditeur', 'Destinataire', 'Commune', 'Catégorie', 'Urgence', 'Statut', 'Assigné à', 'Échéance'].join(';'))

  for (const mail of mails) {
    csvRows.push([
      `"${mail.reference}"`,
      `"${mail.type}"`,
      `"${mail.receiveDate ? new Date(mail.receiveDate).toLocaleDateString('fr-FR') : ''}"`,
      `"${mail.sentDate ? new Date(mail.sentDate).toLocaleDateString('fr-FR') : ''}"`,
      `"${mail.subject.replace(/"/g, '""')}"`,
      `"${mail.channel}"`,
      `"${mail.senderName || ''}"`,
      `"${mail.recipientName || ''}"`,
      `"${mail.city || ''}"`,
      `"${mail.category || ''}"`,
      `"${mail.urgency}"`,
      `"${mail.status}"`,
      `"${mail.assignee?.name || ''}"`,
      `"${mail.responseDueDate ? new Date(mail.responseDueDate).toLocaleDateString('fr-FR') : ''}"`
    ].join(';'))
  }

  const csvContent = "\uFEFF" + csvRows.join('\n') // BOM pour Excel

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="courriers_export_${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
