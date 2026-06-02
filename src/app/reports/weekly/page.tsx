import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PrintButton from './print-button'

export default async function WeeklyReportPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const d = new Date()
  const todayEnd = new Date(d)
  todayEnd.setHours(23, 59, 59, 999)
  
  const startOfWeek = new Date(d)
  startOfWeek.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  // Statistiques de la semaine
  const tasksCreatedThisWeek = await prisma.task.count({ where: { createdAt: { gte: startOfWeek } } })
  const tasksCompletedThisWeek = await prisma.task.count({ where: { completedAt: { gte: startOfWeek }, status: 'TERMINEE' } })
  const tasksOverdue = await prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['TERMINEE', 'ANNULEE'] } } })
  const tasksActive = await prisma.task.count({ where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } } })

  // Répartition par utilisateur
  const users = await prisma.user.findMany({
    include: {
      tasksAssigned: {
        where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } }
      }
    }
  })

  // Répartition par statut
  const statusGroups = await prisma.task.groupBy({
    by: ['status'],
    _count: true
  })

  // Répartition par priorité
  const priorityGroups = await prisma.task.groupBy({
    by: ['priority'],
    _count: true,
    where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } }
  })

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      {/* Entête du rapport */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Rapport Hebdomadaire</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
            Semaine du {startOfWeek.toLocaleDateString('fr-FR')} au {todayEnd.toLocaleDateString('fr-FR')}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* KPI Principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{tasksCreatedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tâches Créées</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{tasksCompletedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tâches Réalisées</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{tasksOverdue}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>En Retard</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{tasksActive}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Actives</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Colonne Gauche : Répartitions */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Charge par Collaborateur
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {u.tasksAssigned.length} tâche(s) active(s)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Répartition par Priorité (Actives)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {priorityGroups.map(p => (
                <tr key={p.priority} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>
                    <span style={{ color: p.priority === 'HAUTE' ? 'var(--danger)' : 'inherit' }}>{p.priority}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>
                    {p._count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Colonne Droite : Statuts */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Répartition par Statut (Global)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {statusGroups.map(s => (
                <tr key={s.status} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{s.status}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>
                    {s._count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Impression */}
      <div style={{ marginTop: '4rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Rapport généré le {new Date().toLocaleString('fr-FR')} par le système du Bureau Parlementaire.
      </div>
    </div>
  )
}
