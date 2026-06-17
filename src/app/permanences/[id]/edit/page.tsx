import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import EditForm from './edit-form'

export default async function EditPermanencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.update') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const { id } = await params

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('permanences')

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Modifier les informations générales</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Mettez à jour le titre, la date de début planifiée ou les notes d'organisation.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <EditForm permanence={permanence} users={JSON.parse(JSON.stringify(users))} fieldConfig={fieldConfig} />
      </div>
    </div>
  )
}
