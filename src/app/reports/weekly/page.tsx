import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PrintButton from './print-button'
import { calculateCounters, getReferencePeriodStart } from '@/lib/planning-utils'

export default async function WeeklyReportPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const d = new Date()
  const todayEnd = new Date(d)
  todayEnd.setHours(23, 59, 59, 999)
  
  const startOfWeek = new Date(d)
  startOfWeek.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  // --- STATS TACHES ---
  const tasksCreatedThisWeek = await prisma.task.count({ where: { createdAt: { gte: startOfWeek } } })
  const tasksCompletedThisWeek = await prisma.task.count({ where: { completedAt: { gte: startOfWeek }, status: 'TERMINEE' } })
  const tasksOverdue = await prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['TERMINEE', 'ANNULEE'] } } })
  const tasksActive = await prisma.task.count({ where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } } })

  // --- STATS COURRIERS ---
  const mailsReceivedThisWeek = await prisma.mailCase.count({ where: { receiveDate: { gte: startOfWeek } } })
  const mailsRespondedThisWeek = await prisma.mailCase.count({ where: { status: 'REPONDU', updatedAt: { gte: startOfWeek } } })
  const mailsOverdue = await prisma.mailCase.count({ where: { responseDueDate: { lt: new Date() }, status: { notIn: ['REPONDU', 'CLASSE'] } } })

  // --- STATS QE ---
  const qeSubmittedThisWeek = await prisma.writtenQuestion.count({ where: { depositDate: { gte: startOfWeek } } })
  const qeWaitingAnswer = await prisma.writtenQuestion.count({ where: { status: { in: ['DEPOSEE', 'EN_ATTENTE'] } } })
  const qeToReturn = await prisma.writtenQuestion.count({ where: { status: 'REPONSE_RECUE', followUpDescription: { not: null }, archivedAt: null } })

  // --- STATS PLANNING & UTILISATEURS ---
  const users = await prisma.user.findMany({
    include: {
      tasksAssigned: { where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } } },
      mailCases: { where: { status: { notIn: ['REPONDU', 'CLASSE'] } } },
      writtenQuestions: { where: { status: 'REPONSE_RECUE', followUpDescription: { not: null }, archivedAt: null } },
      employeeSetting: true,
      statuses: {
        where: {
          date: { gte: new Date(Date.UTC(new Date().getUTCFullYear() - 2, 0, 1)) }
        }
      }
    }
  })

  // Répartition par priorité (Tâches)
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Rapport Hebdomadaire Global</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
            Synthèse d&apos;activité du {startOfWeek.toLocaleDateString('fr-FR')} au {todayEnd.toLocaleDateString('fr-FR')}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* KPI Principaux */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Indicateurs Clés</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {/* Ligne 1: Tâches */}
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{tasksCreatedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tâches Créées</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{tasksCompletedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tâches Réalisées</div>
        </div>
        
        {/* Ligne 1: Courriers & QE */}
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{mailsReceivedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Courriers Reçus</div>
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{qeSubmittedThisWeek}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>QE Déposées</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Colonne Gauche : Charge par Collaborateur & Priorités */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Charge de Travail Active
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ paddingBottom: '0.5rem' }}>Collaborateur</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'center' }}>Tâches</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'center' }}>Courriers</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'center' }}>QE Retours</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{u.tasksAssigned.length}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{u.mailCases.length}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>{u.writtenQuestions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Points de Vigilance
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500, color: 'var(--danger)' }}>Tâches en retard</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>{tasksOverdue}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500, color: 'var(--danger)' }}>Courriers hors délai</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>{mailsOverdue}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500, color: 'var(--warning)' }}>QE Attente Réponse</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>{qeWaitingAnswer}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500, color: 'var(--primary)' }}>QE Retours à faire</td>
                <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>{qeToReturn}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Colonne Droite : Suivi Planning */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            Suivi des Jours Travaillés (Quotas)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Données depuis le début de la période de référence de chaque salarié.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ paddingBottom: '0.5rem' }}>Collaborateur</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Travaillés</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Solde Reste</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const settings = u.employeeSetting || { annualWorkingDays: 218, referencePeriodStartMonth: 6, referencePeriodStartDay: 1 }
                const refStart = getReferencePeriodStart(new Date(), settings.referencePeriodStartMonth, settings.referencePeriodStartDay)
                const refEnd = new Date(Date.UTC(refStart.getUTCFullYear() + 1, refStart.getUTCMonth(), refStart.getUTCDate() - 1))
                
                const mappedStatuses = u.statuses.map(s => ({ date: s.date, dayType: s.dayType }))
                const yearCounters = calculateCounters(refStart, refEnd, mappedStatuses)
                
                const remaining = settings.annualWorkingDays - yearCounters.worked
                const isWarning = remaining <= 5

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>{yearCounters.worked} j</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold', color: isWarning ? 'var(--danger)' : 'inherit' }}>
                      {remaining} j
                    </td>
                  </tr>
                )
              })}
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
