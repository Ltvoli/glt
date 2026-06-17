import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusWidget from './status-widget'
import { AlertCircle, CalendarDays, CheckCircle2, Clock, Mail, HelpCircle, PlusCircle, Users, Copy, CheckSquare } from 'lucide-react'
import { DashboardMailsChart } from './dashboard-charts'
import { unstable_cache } from 'next/cache'

// Cached query for dashboard counts
const getDashboardCounts = unstable_cache(
  async (
    userId: string,
    dbRole: string | null | undefined,
    isTeam: boolean,
    todayStartMs: number,
    todayEndMs: number,
    tomorrowStartMs: number,
    tomorrowEndMs: number,
    startOfWeekMs: number,
    sixtyDaysAgoMs: number
  ) => {
    const baseWhere = isTeam ? {} : { assigneeId: userId }
    const todayStart = new Date(todayStartMs)
    const todayEnd = new Date(todayEndMs)
    const tomorrowStart = new Date(tomorrowStartMs)
    const tomorrowEnd = new Date(tomorrowEndMs)
    const startOfWeek = new Date(startOfWeekMs)
    const sixtyDaysAgo = new Date(sixtyDaysAgoMs)
    const activeTasksWhere = { ...baseWhere, status: { notIn: ['TERMINEE', 'ANNULEE'] } }

    const [
      totalActive, overdueCount, dueTodayCount, dueTomorrowCount,
      inProgressCount, pendingCount, completedThisWeekCount,
      pendingMailsCount, lateMailsCount, urgentMailsCount, receivedThisWeekCount, answeredThisWeekCount,
      qeDepositedCount, qePendingCount, qeLateCount, qeAnsweredCount, qeFollowUpCount,
      newContactsThisWeek, pendingDuplicates,
      mailsToValidateCount
    ] = await Promise.all([
      // Tâches
      prisma.task.count({ where: activeTasksWhere }),
      prisma.task.count({ where: { ...activeTasksWhere, dueDate: { lt: todayStart } } }),
      prisma.task.count({ where: { ...activeTasksWhere, dueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { ...activeTasksWhere, dueDate: { gte: tomorrowStart, lte: tomorrowEnd } } }),
      prisma.task.count({ where: { ...baseWhere, status: 'EN_COURS' } }),
      prisma.task.count({ where: { ...baseWhere, status: 'EN_ATTENTE' } }),
      prisma.task.count({ where: { ...baseWhere, status: 'TERMINEE', completedAt: { gte: startOfWeek } } }),
      
      // Courriers
      prisma.mailCase.count({ where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] } } }),
      prisma.mailCase.count({ where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] }, responseDueDate: { lt: new Date() } } }),
      prisma.mailCase.count({ where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] }, urgency: 'HAUTE' } }),
      prisma.mailCase.count({ where: { ...baseWhere, receiveDate: { gte: startOfWeek } } }),
      prisma.mailCase.count({ where: { ...baseWhere, status: 'REPONDU', updatedAt: { gte: startOfWeek } } }),
      
      // QE
      prisma.writtenQuestion.count({ where: { ...baseWhere, status: { in: ['DEPOSEE', 'EN_ATTENTE'] }, archivedAt: null } }),
      prisma.writtenQuestion.count({ where: { ...baseWhere, status: 'EN_ATTENTE', archivedAt: null } }),
      prisma.writtenQuestion.count({ where: { ...baseWhere, status: 'EN_ATTENTE', depositDate: { lt: sixtyDaysAgo }, archivedAt: null } }),
      prisma.writtenQuestion.count({ where: { ...baseWhere, status: { in: ['REPONSE_RECUE', 'RETOUR_EFFECTUE'] }, archivedAt: null } }),
      prisma.writtenQuestion.count({ where: { ...baseWhere, status: 'REPONSE_RECUE', followUpDescription: { not: null }, archivedAt: null } }),
      
      // Contacts
      prisma.contact.count({ where: { createdAt: { gte: startOfWeek }, archivedAt: null } }),
      prisma.duplicateCandidate.count({ where: { status: 'PENDING' } }),
      
      // Validation courriers
      prisma.mailCase.count({ 
        where: (dbRole === 'SUPERVISEUR' || dbRole === 'ADMINISTRATEUR')
          ? { validationStatus: 'A_VALIDER' }
          : { ...baseWhere, validationStatus: 'A_VALIDER' }
      })
    ])

    return {
      totalActive, overdueCount, dueTodayCount, dueTomorrowCount,
      inProgressCount, pendingCount, completedThisWeekCount,
      pendingMailsCount, lateMailsCount, urgentMailsCount, receivedThisWeekCount, answeredThisWeekCount,
      qeDepositedCount, qePendingCount, qeLateCount, qeAnsweredCount, qeFollowUpCount,
      newContactsThisWeek, pendingDuplicates,
      mailsToValidateCount
    }
  },
  ['dashboard-counts-v1'],
  { revalidate: 300 }
)

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

  const sixtyDaysAgo = new Date(todayStart)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const activeTasksWhere = { ...baseWhere, status: { notIn: ['TERMINEE', 'ANNULEE'] } }

  // 1. Fetch cached counts
  const counts = await getDashboardCounts(
    session.userId,
    session.dbRole,
    isTeam,
    todayStart.getTime(),
    todayEnd.getTime(),
    tomorrowStart.getTime(),
    tomorrowEnd.getTime(),
    startOfWeek.getTime(),
    sixtyDaysAgo.getTime()
  )

  const {
    totalActive, overdueCount, dueTodayCount, dueTomorrowCount,
    inProgressCount, pendingCount, completedThisWeekCount,
    pendingMailsCount, lateMailsCount, urgentMailsCount, receivedThisWeekCount, answeredThisWeekCount,
    qeDepositedCount, qePendingCount, qeLateCount, qeAnsweredCount, qeFollowUpCount,
    newContactsThisWeek, pendingDuplicates,
    mailsToValidateCount
  } = counts

  // 2. Fetch real-time alerts, agenda and status
  const [
    alertTasks, agendaTasks, agendaMails, agendaQEs,
    myStatusToday
  ] = await Promise.all([
    // Alertes
    prisma.task.findMany({
      where: { ...activeTasksWhere, OR: [{ dueDate: { lt: tomorrowEnd } }, { priority: 'HAUTE' }] },
      include: { assignee: true },
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
      take: 5
    }),
    
    // Agenda
    prisma.task.findMany({
      where: { ...activeTasksWhere, dueDate: { gte: todayStart, lte: next7DaysEnd } },
      include: { assignee: true }
    }),
    prisma.mailCase.findMany({
      where: { ...baseWhere, status: { notIn: ['REPONDU', 'CLASSE'] }, responseDueDate: { gte: todayStart, lte: next7DaysEnd } },
      include: { assignee: true }
    }),
    prisma.writtenQuestion.findMany({
      where: { ...baseWhere, status: 'REPONSE_RECUE', followUpDescription: { not: null }, followUpDueDate: { gte: todayStart, lte: next7DaysEnd }, archivedAt: null },
      include: { assignee: true }
    }),

    // Statut collaborateur
    prisma.employeeStatus.findUnique({
      where: { employeeId_date: { employeeId: session.userId, date: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) } }
    })
  ])

  // Fusion de tous les événements de l'agenda
  type AgendaItem = {
    id: string;
    date: Date;
    title: string;
    assigneeName: string;
    type: 'TASK' | 'MAIL' | 'QE';
    status: string;
    url: string;
  }

  const allAgendaItems: AgendaItem[] = [
    ...agendaTasks.map(t => ({ id: t.id, date: t.dueDate!, title: t.title, assigneeName: t.assignee?.name || 'Non assigné', type: 'TASK' as const, status: t.status, url: `/tasks/${t.id}` })),
    ...agendaMails.map(m => ({ id: m.id, date: m.responseDueDate!, title: `Courrier: ${m.subject}`, assigneeName: m.assignee?.name || 'Non assigné', type: 'MAIL' as const, status: 'À traiter', url: `/mails/${m.id}` })),
    ...agendaQEs.map(q => ({ id: q.id, date: q.followUpDueDate!, title: `QE Retour: ${q.title}`, assigneeName: q.assignee?.name || 'Non assigné', type: 'QE' as const, status: 'Retour à faire', url: `/qe/${q.id}` }))
  ]

  // Tri global par date
  allAgendaItems.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Groupement par date pour l'agenda
  const agendaGrouped = allAgendaItems.reduce((acc, item) => {
    const dateKey = item.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {} as Record<string, AgendaItem[]>)

  const mailChartData = [
    { name: 'À Traiter', value: pendingMailsCount, color: '#f59e0b' },
    { name: 'En retard', value: lateMailsCount, color: '#ef4444' },
    { name: 'Répondus (sem.)', value: answeredThisWeekCount, color: '#10b981' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* HEADER & GLOBAL ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Bonjour {user?.name} 👋</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tableau de bord opérationnel du bureau parlementaire.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/?filter=me" className={`button ${!isTeam ? '' : 'outline'}`}>Mes affaires</Link>
          <Link href="/?filter=team" className={`button ${isTeam ? '' : 'outline'}`}>Toute l'équipe</Link>
        </div>
      </div>

      <StatusWidget currentStatus={myStatusToday?.status} />

      {/* QUICK ACTIONS BAR */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/tasks/new" className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <CheckSquare size={16} /> Nouvelle Tâche
          </Link>
          <Link href="/mails/new" className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Mail size={16} /> Nouveau Courrier
          </Link>
          <Link href="/qe/new" className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <HelpCircle size={16} /> Nouvelle QE
          </Link>
          <Link href="/contacts/new" className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Users size={16} /> Nouveau Contact
          </Link>
        </div>
      </div>

      {/* OVERVIEW GRID */}
      {mailsToValidateCount > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#c2410c' }}>
            <AlertCircle size={24} />
            <div>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>Action requise : Courriers à valider</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Vous avez {mailsToValidateCount} courrier{mailsToValidateCount > 1 ? 's' : ''} sortant{mailsToValidateCount > 1 ? 's' : ''} en attente de votre validation.</p>
            </div>
          </div>
          <Link href="/mails" className="button" style={{ backgroundColor: '#ea580c', borderColor: '#ea580c', color: 'white' }}>
            Voir les courriers
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* TACHES & ALERTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} color="var(--primary)" /> Tâches
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{overdueCount}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>En retard</div>
              </div>
              <div style={{ backgroundColor: '#fef08a', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#854d0e' }}>{dueTodayCount}</div>
                <div style={{ fontSize: '0.875rem', color: '#854d0e' }}>Aujourd'hui</div>
              </div>
              <div style={{ backgroundColor: '#e0f2fe', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1' }}>{inProgressCount}</div>
                <div style={{ fontSize: '0.875rem', color: '#0369a1' }}>En cours</div>
              </div>
              <div style={{ backgroundColor: '#dcfce3', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{completedThisWeekCount}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Réalisées (sem.)</div>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Alertes Prioritaires</h3>
              {alertTasks.length === 0 ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', color: 'var(--text-muted)', borderRadius: '6px', fontSize: '0.875rem' }}>
                  Aucune alerte critique.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {alertTasks.map(task => {
                    let color = 'var(--text-muted)'
                    let bg = '#f8fafc'
                    if (task.dueDate && task.dueDate < new Date()) { color = 'var(--danger)'; bg = '#fee2e2' } 
                    else if (task.dueDate && task.dueDate < tomorrowEnd) { color = 'var(--warning)'; bg = '#fef08a' } 
                    else if (task.priority === 'HAUTE') { color = 'var(--danger)'; bg = '#fee2e2' }
                    return (
                      <Link key={task.id} href={`/tasks/${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: bg, textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 500 }}>{task.title}</span>
                        <span style={{ color }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Haute Prio'}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COURRIERS & QE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} color="var(--primary)" /> Courriers
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <DashboardMailsChart data={mailChartData} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Reçus (sem.)</span>
                  <span style={{ fontWeight: 'bold' }}>{receivedThisWeekCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--warning)' }}>Urgents</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{urgentMailsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--danger)' }}>En retard</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{lateMailsCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} color="var(--primary)" /> Questions Écrites
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{qePendingCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>En attente</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: qeLateCount > 0 ? 'var(--danger)' : 'inherit' }}>{qeLateCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sans rep {'>'}60j</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{qeAnsweredCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Répondues</div>
              </div>
            </div>
          </div>
        </div>

        {/* AGENDA & CONTACTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} color="var(--primary)" /> Agenda (7 jours)
            </h2>
            {Object.keys(agendaGrouped).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun événement prévu.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {Object.entries(agendaGrouped).map(([dateLabel, tasks]) => (
                  <div key={dateLabel}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                      {dateLabel}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tasks.map(item => (
                        <Link key={`${item.type}-${item.id}`} href={item.url} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', textDecoration: 'none', color: 'inherit' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                              {item.type === 'MAIL' && <Mail size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--warning)' }} />}
                              {item.type === 'QE' && <HelpCircle size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--danger)' }} />}
                              {item.title}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ backgroundColor: '#f8fafc' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="var(--primary)" /> Réseau / Contacts
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Ajoutés cette semaine :</span>
              <span style={{ fontWeight: 'bold' }}>{newContactsThisWeek}</span>
            </div>
            {pendingDuplicates > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#fee2e2', color: 'var(--danger)', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><Copy size={14} style={{ display: 'inline', marginRight: '4px' }} /> Doublons détectés</span>
                <Link href="/contacts/duplicates" className="button outline danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                  {pendingDuplicates} à résoudre
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
