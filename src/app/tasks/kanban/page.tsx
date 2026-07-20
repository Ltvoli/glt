import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from './kanban-board'

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, includeCompleted?: string }>
}) {
  const { filter, includeCompleted } = await searchParams
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const isCompletedIncluded = includeCompleted === 'true'

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const whereClause: any = {
    isTemplate: false,
  }

  if (isCompletedIncluded) {
    whereClause.OR = [
      { status: { notIn: ['TERMINEE', 'ANNULEE'] } },
      { 
        status: { in: ['TERMINEE', 'ANNULEE'] },
        updatedAt: { gte: sevenDaysAgo }
      }
    ]
  } else {
    // DEFAULT: Active tasks only
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  }

  if (filter === 'mine') {
    whereClause.assigneeId = session.userId
  } else if (filter === 'urgent') {
    const next2Days = new Date()
    next2Days.setDate(next2Days.getDate() + 2)
    whereClause.OR = [
      { priority: 'HAUTE' },
      { dueDate: { lte: next2Days } }
    ]
  } else if (filter === 'overdue') {
    whereClause.dueDate = { lt: new Date() }
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      assignee: true,
      subtasks: true,
      tags: { include: { tag: true } }
    },
    orderBy: { priority: 'asc' }
  })

  // Format initial pour le Kanban
  const columns: Record<string, any[]> = {
    A_FAIRE: tasks.filter(t => t.status === 'A_FAIRE'),
    EN_COURS: tasks.filter(t => t.status === 'EN_COURS'),
    EN_ATTENTE: tasks.filter(t => t.status === 'EN_ATTENTE'),
  }

  if (isCompletedIncluded) {
    columns.TERMINEE = tasks.filter(t => t.status === 'TERMINEE')
    columns.ANNULEE = tasks.filter(t => t.status === 'ANNULEE')
  }

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Kanban des Tâches</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/tasks" className="button outline">Vue Liste</Link>
          <Link href="/tasks/new" className="button">Nouvelle Tâche</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/tasks/kanban?filter=all" className={`button ${filter === 'all' || !filter ? '' : 'outline'}`}>Toute l'équipe</Link>
        <Link href="/tasks/kanban?filter=mine" className={`button ${filter === 'mine' ? '' : 'outline'}`}>Mes tâches</Link>
        <Link href="/tasks/kanban?filter=urgent" className={`button ${filter === 'urgent' ? '' : 'outline'}`} style={{ borderColor: 'var(--danger)', color: filter === 'urgent' ? 'white' : 'var(--danger)', backgroundColor: filter === 'urgent' ? 'var(--danger)' : 'transparent' }}>Urgentes</Link>
        <Link href="/tasks/kanban?filter=overdue" className={`button ${filter === 'overdue' ? '' : 'outline'}`}>En retard</Link>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link 
            href={`/tasks/kanban?${filter ? `filter=${filter}&` : ''}${isCompletedIncluded ? '' : 'includeCompleted=true'}`}
            className="button outline"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderColor: isCompletedIncluded ? 'var(--primary)' : 'var(--border)' }}
          >
            {isCompletedIncluded ? '✓ 5 Colonnes (avec Terminées)' : '⚡ 3 Colonnes Actives (+ Terminées)'}
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard initialColumns={JSON.parse(JSON.stringify(columns))} />
      </div>
    </div>
  )
}
