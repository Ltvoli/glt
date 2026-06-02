import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, status?: string }>
}) {
  const { filter, status } = await searchParams
  const session = await getSession()

  let whereClause: any = {}

  if (filter === 'mine') {
    whereClause.assigneeId = session?.userId
  } else if (filter === 'overdue') {
    whereClause.dueDate = { lt: new Date() }
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  } else if (filter === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    whereClause.dueDate = { gte: start, lte: end }
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  } else if (filter === 'tomorrow') {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setDate(end.getDate() + 1)
    end.setHours(23, 59, 59, 999)
    whereClause.dueDate = { gte: start, lte: end }
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  }

  if (status) {
    whereClause.status = status
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      assignee: true,
      subtasks: true,
    },
    orderBy: [
      { priority: 'asc' }, // Will need to handle custom sort for priority or just sort by dueDate
      { dueDate: 'asc' }
    ]
  })

  const priorityColors: Record<string, string> = {
    HAUTE: 'var(--danger)',
    NORMALE: 'var(--primary)',
    BASSE: 'var(--text-muted)'
  }

  const statusLabels: Record<string, string> = {
    A_FAIRE: 'À faire',
    EN_COURS: 'En cours',
    EN_ATTENTE: 'En attente',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Tâches</h1>
        <Link href="/tasks/new" className="button">
          <Plus size={16} /> Nouvelle Tâche
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href="/tasks" className={`button ${!filter && !status ? '' : 'outline'}`}>Toutes les tâches</Link>
        <Link href="/tasks?filter=mine" className={`button ${filter === 'mine' ? '' : 'outline'}`}>Mes tâches</Link>
        <Link href="/tasks?status=A_FAIRE" className={`button ${status === 'A_FAIRE' ? '' : 'outline'}`}>À faire</Link>
        <Link href="/tasks?filter=overdue" className={`button ${filter === 'overdue' ? '' : 'outline'}`} style={{ borderColor: 'var(--danger)', color: filter === 'overdue' ? 'white' : 'var(--danger)', backgroundColor: filter === 'overdue' ? 'var(--danger)' : 'transparent' }}>En retard</Link>
        <Link href="/tasks?filter=today" className={`button ${filter === 'today' ? '' : 'outline'}`} style={{ borderColor: 'var(--warning)', color: filter === 'today' ? 'white' : 'var(--warning)', backgroundColor: filter === 'today' ? 'var(--warning)' : 'transparent' }}>Aujourd'hui</Link>
        <Link href="/tasks?filter=tomorrow" className={`button ${filter === 'tomorrow' ? '' : 'outline'}`}>Demain</Link>
        
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/tasks/kanban" className="button outline" style={{ backgroundColor: '#f8fafc', color: 'var(--foreground)' }}>
            Vue Kanban
          </Link>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Échéance</th>
              <th>Assigné à</th>
              <th>Progression</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune tâche trouvée.
                </td>
              </tr>
            ) : (
              tasks.map(task => {
                const totalSubtasks = task.subtasks.length
                const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length
                
                return (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link href={`/tasks/${task.id}`} style={{ color: 'var(--primary)' }}>
                        {task.title}
                      </Link>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        backgroundColor: '#f1f5f9', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 500 
                      }}>
                        {statusLabels[task.status] || task.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: priorityColors[task.priority] || 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td>{task.assignee?.name || 'Non assigné'}</td>
                    <td>
                      {totalSubtasks > 0 ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {completedSubtasks} / {totalSubtasks}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
