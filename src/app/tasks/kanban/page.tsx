import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from './kanban-board'

export default async function KanbanPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const tasks = await prisma.task.findMany({
    include: {
      assignee: true,
      subtasks: true,
    },
    orderBy: { priority: 'asc' } // Tri par défaut (HAUTE, puis NORMALE, puis BASSE)
  })

  // Format initial pour le Kanban (Groupement par statut)
  const columns = {
    A_FAIRE: tasks.filter(t => t.status === 'A_FAIRE'),
    EN_COURS: tasks.filter(t => t.status === 'EN_COURS'),
    EN_ATTENTE: tasks.filter(t => t.status === 'EN_ATTENTE'),
    TERMINEE: tasks.filter(t => t.status === 'TERMINEE'),
    ANNULEE: tasks.filter(t => t.status === 'ANNULEE'),
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

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard initialColumns={columns} />
      </div>
    </div>
  )
}
