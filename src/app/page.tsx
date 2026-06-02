import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusWidget from './status-widget'
import { AlertCircle, CalendarDays, CheckCircle2, Clock } from 'lucide-react'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { filter } = await searchParams
  const isTeam = filter === 'team'
  const baseWhere = isTeam ? {} : { assigneeId: session.userId }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })

  const d = new Date()
  const todayStart = new Date(d)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(d)
  todayEnd.setHours(23, 59, 59, 999)
  
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowEnd = new Date(todayEnd)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

  const next7DaysEnd = new Date(todayEnd)
  next7DaysEnd.setDate(next7DaysEnd.getDate() + 7)

  const startOfWeek = new Date(todayStart)
  startOfWeek.setDate(todayStart.getDate() - (todayStart.getDay() === 0 ? 6 : todayStart.getDay() - 1))

  // --- STATISTIQUES ---
  const activeTasksWhere = { ...baseWhere, status: { notIn: ['TERMINEE', 'ANNULEE'] } }
  const totalActive = await prisma.task.count({ where: activeTasksWhere })
  
  const overdueCount = await prisma.task.count({
    where: { ...activeTasksWhere, dueDate: { lt: todayStart } }
  })
  
  const dueTodayCount = await prisma.task.count({
    where: { ...activeTasksWhere, dueDate: { gte: todayStart, lte: todayEnd } }
  })
  
  const dueTomorrowCount = await prisma.task.count({
    where: { ...activeTasksWhere, dueDate: { gte: tomorrowStart, lte: tomorrowEnd } }
  })

  const inProgressCount = await prisma.task.count({ where: { ...baseWhere, status: 'EN_COURS' } })
  const pendingCount = await prisma.task.count({ where: { ...baseWhere, status: 'EN_ATTENTE' } })
  
  const completedThisWeekCount = await prisma.task.count({
    where: { ...baseWhere, status: 'TERMINEE', completedAt: { gte: startOfWeek } }
  })

  // --- STATISTIQUES COURRIERS ---
  const pendingMailsCount = await prisma.mailCase.count({
    where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] } }
  })
  const lateMailsCount = await prisma.mailCase.count({
    where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] }, responseDueDate: { lt: new Date() } }
  })

  // Taux de complétion simple
  const totalRelevant = completedThisWeekCount + totalActive
  const completionRate = totalRelevant === 0 ? 0 : Math.round((completedThisWeekCount / totalRelevant) * 100)

  // --- ALERTES PRIORITAIRES (Rouge/Orange/Vert) ---
  const alertTasks = await prisma.task.findMany({
    where: {
      ...activeTasksWhere,
      OR: [
        { dueDate: { lt: tomorrowEnd } },
        { priority: 'HAUTE' }
      ]
    },
    include: { assignee: true },
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
    take: 5
  })

  // --- AGENDA DES 7 PROCHAINS JOURS ---
  const agendaTasks = await prisma.task.findMany({
    where: {
      ...activeTasksWhere,
      dueDate: { gte: todayStart, lte: next7DaysEnd }
    },
    include: { assignee: true },
    orderBy: { dueDate: 'asc' }
  })

  // Groupement par date pour l'agenda
  const agendaGrouped = agendaTasks.reduce((acc, task) => {
    const dateKey = new Date(task.dueDate!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, typeof agendaTasks>)

  // Widget statut du jour
  const todayUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const myStatusToday = await prisma.employeeStatus.findUnique({
    where: { employeeId_date: { employeeId: session.userId, date: todayUTC } }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Bonjour {user?.name} 👋</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tableau de bord opérationnel du bureau parlementaire.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/?filter=me" className={`button ${!isTeam ? '' : 'outline'}`}>Mes tâches</Link>
          <Link href="/?filter=team" className={`button ${isTeam ? '' : 'outline'}`}>Toute l'équipe</Link>
        </div>
      </div>

      <StatusWidget currentStatus={myStatusToday?.status} />

      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Tâches</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{overdueCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>En retard</div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{dueTodayCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aujourd'hui</div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{inProgressCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>En cours</div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--success)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{completedThisWeekCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Terminées (semaine)</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Courriers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/mails?filter=late" style={{ textDecoration: 'none' }} className="card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--danger)', height: '100%', paddingTop: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{lateMailsCount}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Courriers en retard</div>
          </div>
        </Link>
        <Link href="/mails?filter=pending" style={{ textDecoration: 'none' }} className="card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--warning)', height: '100%', paddingTop: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{pendingMailsCount}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Courriers à traiter</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Colonne Gauche : Alertes & Taux */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} color="var(--danger)" /> Alertes Prioritaires
            </h2>
            {alertTasks.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> Aucune alerte critique. Tout est à jour !
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alertTasks.map(task => {
                  let color = 'var(--text-muted)'
                  let bg = '#f8fafc'
                  if (task.dueDate && task.dueDate < new Date()) {
                    color = 'var(--danger)'; bg = '#fee2e2'
                  } else if (task.dueDate && task.dueDate < tomorrowEnd) {
                    color = 'var(--warning)'; bg = '#fef08a'
                  } else if (task.priority === 'HAUTE') {
                    color = 'var(--danger)'; bg = '#fee2e2'
                  }

                  return (
                    <Link key={task.id} href={`/tasks/${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '6px', backgroundColor: bg, textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ fontWeight: 600 }}>{task.title}</span>
                      <span style={{ fontSize: '0.75rem', color }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Haute Prio'}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Taux de complétion (Semaine)</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${completionRate}%`, backgroundColor: 'var(--success)', height: '100%', transition: 'width 0.5s ease' }}></div>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{completionRate}%</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {completedThisWeekCount} tâches terminées sur {totalRelevant}
            </p>
          </div>
        </div>

        {/* Colonne Droite : Agenda */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={20} color="var(--primary)" /> Agenda des 7 prochains jours
          </h2>
          {Object.keys(agendaGrouped).length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aucune tâche prévue dans les 7 prochains jours.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(agendaGrouped).map(([dateLabel, tasks]) => (
                <div key={dateLabel}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                    {dateLabel}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tasks.map(task => (
                      <Link key={task.id} href={`/tasks/${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{task.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.assignee?.name || 'Non assigné'}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', height: 'fit-content' }}>
                          {task.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
