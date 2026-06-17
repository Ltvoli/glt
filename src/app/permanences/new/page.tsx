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

  const dbUsers = await prisma.user.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true }
  })

  const users = dbUsers.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim()
  }))

  const contacts = await prisma.contact.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true, email: true, city: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  })

  const formattedContacts = contacts.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.mobilePhone || c.phone,
    email: c.email,
    city: c.city,
  }))

  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('permanences')

  return (
    <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Nouvelle Permanence Mobile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Initialisez une permanence mobile et planifiez les différentes communes de passage pour cette journée.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem', backgroundColor: 'white' }}>
        <PermanenceForm 
          communes={communes} 
          users={JSON.parse(JSON.stringify(users))} 
          contacts={formattedContacts}
          fieldConfig={fieldConfig} 
        />
      </div>
    </div>
  )
}
