import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TaskEditor from '../task-editor'

const SECTIONS = [
  { key: 'communication', name: 'Communication', desc: 'Email élus, publications réseaux sociaux, presse.' },
  { key: 'phoning', name: 'Phoning Électeurs', desc: 'Appels et invitations ciblées depuis le CRM.' },
  { key: 'courrier', name: 'Courrier Postal', desc: 'Envois physiques aux contacts sans adresse email.' },
  { key: 'commercants', name: 'Commerçants', desc: 'Attitudes et visites prévues lors de la permanence.' },
  { key: 'institutionnel', name: 'Institutionnel & Presse', desc: 'Convocations mairies et communiqués de presse.' },
  { key: 'logistique', name: 'Logistique & Accès', desc: 'Réservation de parking, matériel, accès aux lieux.' }
]

export default async function PreparationPage({
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
        orderBy: { order: 'asc' },
        include: {
          histories: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }
          }
        }
      }
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const usersData = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ]
  })
  const users = usersData.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }))

  const isReadOnly = session.role === 'READONLY'

  return (
    <div>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Préparation Centrale</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Toutes les tâches nécessaires pour préparer cette permanence, regroupées par section.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {SECTIONS.map(section => {
          const sectionTasks = permanence.tasks.filter(t => t.section === section.key)
          const totalTasks = sectionTasks.length
          const completedTasks = sectionTasks.filter(t => t.status === 'DONE').length
          const completionPercent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100)

          return (
            <details key={section.key} className="card" style={{ padding: 0, overflow: 'hidden' }} open={completionPercent < 100}>
              <summary style={{
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--background)',
                listStyle: 'none',
                userSelect: 'none',
                borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{section.name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>{section.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '100px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${completionPercent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '0.875rem', minWidth: '40px', textAlign: 'right' }}>{completionPercent}%</span>
                </div>
              </summary>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc' }}>
                <TaskEditor 
                  permanenceId={id}
                  sectionKey={section.key}
                  initialTasks={sectionTasks}
                  users={users}
                  isReadOnly={isReadOnly}
                />
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
