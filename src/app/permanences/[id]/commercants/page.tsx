import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TaskEditor from '../task-editor'
import CommercantsClient from './commercants-client'

export default async function CommercantsPage({
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
        where: { section: 'commercants' },
        orderBy: { order: 'asc' }
      },
      organizations: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const totalTasks = permanence.tasks.length
  const completedTasks = permanence.tasks.filter(t => t.status === 'DONE').length
  const completionPercent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100)

  // Fetch active users for task assignee dropdown
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  // Fetch CRM organizations of type COMMERCE
  const crmOrgs = await prisma.organization.findMany({
    where: { archivedAt: null, type: 'COMMERCE' },
    select: {
      id: true,
      name: true,
      sector: true,
      notes: true
    },
    orderBy: { name: 'asc' }
  })

  const isReadOnly = session.role === 'READONLY'

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* BREADCRUMB */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/permanences" className="text-blue-600 hover:underline">Permanences</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&gt;</span>
        <Link href={`/permanences/${id}`} className="text-blue-600 hover:underline">{permanence.title}</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--text-muted)' }}>Commerçants</span>
      </div>

      {/* HEADER SECTION */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Section Commerçants</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Gérez les commerces locaux à visiter et associez-les à la permanence mobile.</p>
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
      <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Tâches logistiques Commerçants</h3>
      <TaskEditor 
        permanenceId={id}
        sectionKey="commercants"
        initialTasks={permanence.tasks}
        users={users}
        isReadOnly={isReadOnly}
      />

      {/* MERCHANTS LIST CONTAINER */}
      <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '3rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Parcours de visite Commerces</h3>
      <CommercantsClient
        permanenceId={id}
        merchantOrgs={permanence.organizations}
        crmOrgs={crmOrgs}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
