import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, ListTodo } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  communication: 'Communication',
  phoning: 'Phoning',
  courrier: 'Courrier',
  commercants: 'Commerçants',
  institutionnel: 'Institutionnel & Presse',
  logistique: 'Logistique',
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
  CANCELLED: 'Annulé',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  TODO: { bg: '#fee2e2', text: '#991b1b' },
  IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
  DONE: { bg: '#d1fae5', text: '#065f46' },
  CANCELLED: { bg: '#f3f4f6', text: '#6b7280' },
}

export default async function MesTachesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.read') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const { id } = await params

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null },
    include: {
      tasks: {
        include: { assigneeUser: true },
        orderBy: [{ section: 'asc' }, { order: 'asc' }]
      }
    }
  })

  if (!permanence) redirect('/permanences')

  // Filter tasks by role/user
  const isSuperAdmin = session.role === 'SUPERADMIN'
  const isDeputy = session.permissions.includes('permanences.validate')

  let tasks = permanence.tasks
  if (!isSuperAdmin && !isDeputy) {
    // Collaborateur: only see their assigned tasks
    tasks = tasks.filter(t => t.assigneeUserId === session.userId || t.assigneeUserId === null)
  }

  // Group by section
  const bySection = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
    if (!acc[t.section]) acc[t.section] = []
    acc[t.section].push(t)
    return acc
  }, {})

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'DONE').length
  const todoTasks = tasks.filter(t => t.status === 'TODO').length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const blockers = tasks.filter(t => t.required && t.status !== 'DONE')

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* BREADCRUMB */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link href="/permanences" style={{ color: 'var(--primary)' }}>Permanences</Link>
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        <Link href={`/permanences/${id}`} style={{ color: 'var(--primary)' }}>{permanence.title}</Link>
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Mes Tâches</span>
      </div>

      {/* HEADER */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <ListTodo size={28} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Mes Tâches</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {isSuperAdmin || isDeputy
                ? 'Toutes les tâches de cette permanence (vue complète)'
                : 'Vos tâches assignées pour cette permanence'}
            </p>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Total', value: totalTasks, color: '#6366f1', bg: '#ede9fe' },
            { label: 'À faire', value: todoTasks, color: '#dc2626', bg: '#fee2e2' },
            { label: 'En cours', value: inProgressTasks, color: '#2563eb', bg: '#dbeafe' },
            { label: 'Terminées', value: doneTasks, color: '#16a34a', bg: '#d1fae5' },
          ].map(s => (
            <div key={s.label} style={{ padding: '1rem', borderRadius: '8px', background: s.bg, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCKERS */}
      {blockers.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} />
            {blockers.length} tâche{blockers.length > 1 ? 's' : ''} obligatoire{blockers.length > 1 ? 's' : ''} en attente
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {blockers.map(t => (
              <span key={t.id} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                [{SECTION_LABELS[t.section] || t.section}] {t.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TASKS BY SECTION */}
      {Object.entries(bySection).length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ListTodo size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Aucune tâche assignée</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Les tâches vous seront assignées par votre responsable.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(bySection).map(([section, sectionTasks]) => {
            const sectionDone = sectionTasks.filter(t => t.status === 'DONE').length
            return (
              <div key={section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {SECTION_LABELS[section] || section}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {sectionDone}/{sectionTasks.length} terminées
                    </span>
                    <Link href={`/permanences/${id}/${section}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Ouvrir <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tâche</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigné à</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionTasks.map((task, idx) => {
                        const sc = STATUS_COLORS[task.status] || STATUS_COLORS.TODO
                        return (
                          <tr key={task.id} style={{ borderBottom: idx < sectionTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {task.required && (
                                  <span title="Tâche obligatoire" style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.35rem', background: '#fef3c7', color: '#92400e', borderRadius: '3px' }}>
                                    REQUIS
                                  </span>
                                )}
                                {task.status === 'DONE'
                                  ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                  : <Clock size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                }
                                <span style={{ fontSize: '0.875rem', fontWeight: task.required ? 600 : 400 }}>{task.label}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px', ...sc }}>
                                {STATUS_LABELS[task.status] || task.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                              {task.assigneeUser?.name || '—'}
                            </td>
                            <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                              {task.comment || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* BACK LINK */}
      <div style={{ marginTop: '2rem' }}>
        <Link href={`/permanences/${id}`} className="button outline">
          ← Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
