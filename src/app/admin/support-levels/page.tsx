import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SupportLevelsClient from './support-levels-client'

export default async function AdminSupportLevelsPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/auth/unauthorized')
  }

  // Fetch support levels ordered by order field
  const supportLevels = await prisma.supportLevel.findMany({
    orderBy: { order: 'asc' }
  })

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Niveaux de soutien
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          Gérez les différents niveaux de soutien qualifiant la relation avec vos contacts (citoyens, militants, etc.).
        </p>
      </div>

      <SupportLevelsClient
        currentUserRole={session.dbRole}
        supportLevels={supportLevels}
      />
    </div>
  )
}
