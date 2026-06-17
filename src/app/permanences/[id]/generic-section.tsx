import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TaskEditor from './task-editor'

type GenericSectionProps = {
  permanenceId: string
  sectionKey: string
  sectionName: string
}

export default async function GenericSection({ permanenceId, sectionKey, sectionName }: GenericSectionProps) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.read') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id: permanenceId, archivedAt: null },
    include: {
      tasks: {
        where: { section: sectionKey },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const totalTasks = permanence.tasks.length
  const completedTasks = permanence.tasks.filter(t => t.status === 'DONE').length
  const completionPercent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100)

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
      {/* HEADER SECTION */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Section {sectionName}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Suivi des tâches de préparation de la section.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{completionPercent}%</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{completedTasks} sur {totalTasks} faites</div>
          </div>
        </div>

        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${completionPercent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }}></div>
        </div>
      </div>

      {/* TASK LIST EDITOR */}
      <TaskEditor 
        permanenceId={permanenceId}
        sectionKey={sectionKey}
        initialTasks={permanence.tasks}
        users={users}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
