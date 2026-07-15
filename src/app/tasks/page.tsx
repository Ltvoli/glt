import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getSession } from '@/lib/session'
import PaginationBar from '../contacts/pagination-bar'
import TaskTableClient from './task-table-client'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, status?: string, priority?: string, assigneeId?: string, tag?: string, sort?: string, order?: 'asc'|'desc', page?: string, perPage?: string }>
}) {
  const { filter, status, priority, assigneeId, tag, sort, order = 'asc', page, perPage } = await searchParams
  const session = await getSession()

  const currentPage = Math.max(1, parseInt(page || '1'))
  const itemsPerPage = Math.min(200, Math.max(10, parseInt(perPage || '50')))

  const whereClause: any = {}

  if (filter === 'recurring') {
    whereClause.isTemplate = true
  } else {
    whereClause.isTemplate = false
  }

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
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    whereClause.dueDate = { gte: start, lte: end }
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  } else if (filter === 'urgent') {
    const next2Days = new Date()
    next2Days.setDate(next2Days.getDate() + 2)
    whereClause.OR = [
      { priority: 'HAUTE' },
      { dueDate: { lte: next2Days } }
    ]
    whereClause.status = { notIn: ['TERMINEE', 'ANNULEE'] }
  } else if (filter === 'all') {
    // "toute l'équipe", don't filter by assignee
  }

  if (status) whereClause.status = status
  if (priority) whereClause.priority = priority
  if (assigneeId) whereClause.assigneeId = assigneeId
  if (tag) {
    whereClause.tags = {
      some: { tag: { name: { contains: tag, mode: 'insensitive' } } }
    }
  }

  let orderByClause: any = [{ priority: 'asc' }, { dueDate: 'asc' }]
  if (sort === 'status') orderByClause = { status: order }
  else if (sort === 'priority') orderByClause = { priority: order }
  else if (sort === 'dueDate') orderByClause = { dueDate: order }
  else if (sort === 'assignee') orderByClause = [{ assignee: { lastName: order } }, { assignee: { firstName: order } }]
  else if (sort === 'createdAt') orderByClause = { createdAt: order }
  else if (sort === 'updatedAt') orderByClause = { updatedAt: order }

  const [tasks, totalTasks, users] = await Promise.all([
    prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: true,
        subtasks: true,
        tags: { include: { tag: true } }
      },
      orderBy: orderByClause,
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
    }),
    prisma.task.count({ where: whereClause }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null }
    })
  ])

  const totalPages = Math.ceil(totalTasks / itemsPerPage)

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
        <Link href="/tasks?filter=all" className={`button ${filter === 'all' || (!filter && !status) ? '' : 'outline'}`}>Toute l'équipe</Link>
        <Link href="/tasks?filter=mine" className={`button ${filter === 'mine' ? '' : 'outline'}`}>Mes tâches</Link>
        <Link href="/tasks?status=EN_ATTENTE" className={`button ${status === 'EN_ATTENTE' ? '' : 'outline'}`}>En attente</Link>
        <Link href="/tasks?status=EN_COURS" className={`button ${status === 'EN_COURS' ? '' : 'outline'}`}>En cours</Link>
        <Link href="/tasks?status=TERMINEE" className={`button ${status === 'TERMINEE' ? '' : 'outline'}`}>Terminées</Link>
        <Link href="/tasks?filter=urgent" className={`button ${filter === 'urgent' ? '' : 'outline'}`} style={{ borderColor: 'var(--danger)', color: filter === 'urgent' ? 'white' : 'var(--danger)', backgroundColor: filter === 'urgent' ? 'var(--danger)' : 'transparent' }}>Urgentes</Link>
        <Link href="/tasks?filter=overdue" className={`button ${filter === 'overdue' ? '' : 'outline'}`}>En retard</Link>
        <Link href="/tasks?filter=today" className={`button ${filter === 'today' ? '' : 'outline'}`}>Aujourd'hui</Link>
        <Link href="/tasks?filter=tomorrow" className={`button ${filter === 'tomorrow' ? '' : 'outline'}`}>Demain</Link>
        <Link href="/tasks?filter=recurring" className={`button ${filter === 'recurring' ? '' : 'outline'}`}>Modèles récurrents</Link>
        
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/tasks" className="button outline" style={{ color: 'var(--danger)' }}>
            Réinitialiser filtres
          </Link>
          <Link href="/tasks/kanban" className="button outline" style={{ backgroundColor: '#f8fafc', color: 'var(--foreground)', marginLeft: '1rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Trier par</label>
          <select name="sort" defaultValue={sort || ''} className="form-control" style={{ padding: '0.25rem' }}>
            <option value="">Défaut (Priorité)</option>
            <option value="status">État</option>
            <option value="dueDate">Échéance</option>
            <option value="assignee">Responsable</option>
            <option value="createdAt">Création</option>
            <option value="updatedAt">Modification</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ordre</label>
          <select name="order" defaultValue={order || 'asc'} className="form-control" style={{ padding: '0.25rem' }}>
            <option value="asc">Croissant</option>
            <option value="desc">Décroissant</option>
          </select>
        </div>
        {filter && <input type="hidden" name="filter" value={filter} />}
        {status && <input type="hidden" name="status" value={status} />}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="button" style={{ padding: '0.25rem 1rem' }}>Filtrer & Trier</button>
        </div>
      </form>

      <TaskTableClient tasks={JSON.parse(JSON.stringify(tasks))} />

      <div style={{ marginTop: '1.5rem' }}>
        <PaginationBar currentPage={currentPage} totalPages={totalPages} currentParams={{ filter, status, priority, assigneeId, tag, sort, order, page, perPage }} itemsPerPage={itemsPerPage} />
      </div>
    </div>
  )
}
