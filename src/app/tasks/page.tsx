import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, status?: string, priority?: string, assigneeId?: string, tag?: string }>
}) {
  const { filter, status, priority, assigneeId, tag } = await searchParams
  const session = await getSession()

  const whereClause: any = {}

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

  if (status) whereClause.status = status
  if (priority) whereClause.priority = priority
  if (assigneeId) whereClause.assigneeId = assigneeId
  if (tag) {
    whereClause.tags = {
      some: { tag: { name: { contains: tag, mode: 'insensitive' } } }
    }
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      assignee: true,
      subtasks: true,
      tags: { include: { tag: true } }
    },
    orderBy: [
      { priority: 'asc' },
      { dueDate: 'asc' }
    ]
  })

  const users = await prisma.user.findMany()

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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/api/export/tasks${status ? `?status=${status}` : ''}`} className="button outline hide-on-print">
            Exporter CSV
          </a>
          <Link href="/tasks/new" className="button">
            <Plus size={16} /> Nouvelle Tâche
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href="/tasks" className={`button ${!filter && !status && !priority && !assigneeId && !tag ? '' : 'outline'}`}>Toutes les tâches</Link>
        <Link href="/tasks?filter=mine" className={`button ${filter === 'mine' ? '' : 'outline'}`}>Mes tâches</Link>
        <Link href="/tasks?status=A_FAIRE" className={`button ${status === 'A_FAIRE' ? '' : 'outline'}`}>À faire</Link>
        <Link href="/tasks?filter=overdue" className={`button ${filter === 'overdue' ? '' : 'outline'}`} style={{ borderColor: 'var(--danger)', color: filter === 'overdue' ? 'white' : 'var(--danger)', backgroundColor: filter === 'overdue' ? 'var(--danger)' : 'transparent' }}>En retard</Link>
        <Link href="/tasks?filter=today" className={`button ${filter === 'today' ? '' : 'outline'}`} style={{ borderColor: 'var(--warning)', color: filter === 'today' ? 'white' : 'var(--warning)', backgroundColor: filter === 'today' ? 'var(--warning)' : 'transparent' }}>Aujourd&apos;hui</Link>
        <Link href="/tasks?filter=tomorrow" className={`button ${filter === 'tomorrow' ? '' : 'outline'}`}>Demain</Link>
        
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/tasks/kanban" className="button outline" style={{ backgroundColor: '#f8fafc', color: 'var(--foreground)' }}>
            Vue Kanban
          </Link>
        </div>
      </div>

      <form method="GET" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Responsable</label>
          <select name="assigneeId" defaultValue={assigneeId || ''} className="form-control" style={{ padding: '0.25rem' }}>
            <option value="">Tous</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Priorité</label>
          <select name="priority" defaultValue={priority || ''} className="form-control" style={{ padding: '0.25rem' }}>
            <option value="">Toutes</option>
            <option value="HAUTE">Haute</option>
            <option value="NORMALE">Normale</option>
            <option value="BASSE">Basse</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tag</label>
          <input type="text" name="tag" defaultValue={tag || ''} className="form-control" style={{ padding: '0.25rem' }} placeholder="Rechercher..." />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="button" style={{ padding: '0.25rem 1rem' }}>Filtrer</button>
        </div>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Livrable attendu</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Échéance</th>
              <th>Assigné à</th>
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
                return (
                  <tr key={task.id}>
                    <td>
                      <Link href={`/tasks/${task.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {task.title}
                      </Link>
                      {task.tags && task.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {task.tags.map((t: any) => (
                            <span key={t.tag.id} style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{task.expectedDeliverable || '-'}</span>
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
