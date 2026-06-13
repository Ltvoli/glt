import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LocationsClient from './locations-client'

export default async function PermanenceLocationsPage({
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
      locations: {
        include: {
          commune: true,
          mairieContact: {
            select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true, email: true }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const communes = await prisma.commune.findMany({
    orderBy: { name: 'asc' }
  })

  // Fetch all contacts for mairie contact picker
  const contacts = await prisma.contact.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true, email: true, city: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
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
        <span style={{ color: 'var(--text-muted)' }}>Communes &amp; Lieux</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Communes &amp; Lieux</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Planifiez les différents arrêts et points d&apos;accueil de la permanence mobile.</p>
        </div>
      </div>

      <LocationsClient
        permanenceId={id}
        locations={permanence.locations.map(l => ({
          ...l,
          mairieContact: l.mairieContact ? {
            id: l.mairieContact.id,
            firstName: l.mairieContact.firstName,
            lastName: l.mairieContact.lastName,
            phone: l.mairieContact.mobilePhone || l.mairieContact.phone,
            email: l.mairieContact.email,
          } : null,
        }))}
        communes={communes}
        contacts={contacts.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.mobilePhone || c.phone,
          email: c.email,
          city: c.city,
        }))}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
