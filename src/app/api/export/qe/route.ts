import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter')

  const whereClause: any = { archivedAt: null }
  
  if (filter === 'draft') {
    whereClause.status = 'BROUILLON'
  } else if (filter === 'pending') {
    whereClause.status = 'EN_ATTENTE'
  } else if (filter === 'answered') {
    whereClause.status = 'REPONSE_RECUE'
  }

  const questions = await prisma.writtenQuestion.findMany({
    where: whereClause,
    include: { assignee: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })

  const headers = [
    'Numéro AN',
    'Titre',
    'Type',
    'Ministère',
    'Thématique',
    'Statut',
    'Date de dépôt',
    'Collaborateur',
    'Retour à faire',
    'Échéance retour'
  ].join(';')

  const rows = questions.map(q => {
    return [
      q.anNumber || '',
      `"${(q.title || '').replace(/"/g, '""')}"`,
      q.type || '',
      `"${(q.ministry || '').replace(/"/g, '""')}"`,
      `"${(q.theme || '').replace(/"/g, '""')}"`,
      q.status || '',
      q.depositDate ? new Date(q.depositDate).toLocaleDateString('fr-FR') : '',
      q.assignee?.name || '',
      `"${(q.followUpDescription || '').replace(/"/g, '""')}"`,
      q.followUpDueDate ? new Date(q.followUpDueDate).toLocaleDateString('fr-FR') : ''
    ].join(';')
  })

  const csv = [headers, ...rows].join('\n')

  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="export_qe.csv"'
    }
  })
}
