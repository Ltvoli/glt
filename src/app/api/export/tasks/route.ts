import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const whereClause: any = { archivedAt: null }
  if (status && status !== 'ALL') {
    whereClause.status = status
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: { assignee: true },
    orderBy: { createdAt: 'desc' }
  })

  let csvContent = "Titre,Statut,Priorité,Assigné à,Date de création,Date d'échéance\n"
  
  tasks.forEach(task => {
    const title = `"${task.title.replace(/"/g, '""')}"`
    const statusVal = task.status
    const priority = task.priority
    const assignee = task.assignee ? `"${task.assignee.name}"` : 'Non assigné'
    const createdAt = task.createdAt.toLocaleDateString('fr-FR')
    const dueDate = task.dueDate ? task.dueDate.toLocaleDateString('fr-FR') : ''
    
    csvContent += `${title},${statusVal},${priority},${assignee},${createdAt},${dueDate}\n`
  })

  // Add UTF-8 BOM for Excel compatibility
  const bom = Buffer.from('\uFEFF', 'utf-8')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')
  const finalBuffer = Buffer.concat([bom, csvBuffer])

  return new NextResponse(finalBuffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="export_taches.csv"'
    }
  })
}
