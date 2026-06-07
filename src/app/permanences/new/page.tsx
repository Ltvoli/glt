import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PermanenceForm from './permanence-form'

export default async function NewPermanencePage() {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.create') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const communes = await prisma.commune.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Nouvelle Permanence Mobile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Initialisez une permanence mobile. Les tâches par défaut seront automatiquement créées.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <PermanenceForm communes={communes} />
      </div>
    </div>
  )
}
