import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
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

  const contacts = await prisma.contact.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true, phone: true, mobilePhone: true, email: true, city: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
  })

  const dbUsers = await prisma.user.findMany({
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true }
  })

  const users = dbUsers.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim()
  }))

  const isReadOnly = session.role === 'READONLY'

  return (
    <LocationsClient
      permanence={{
        id: permanence.id,
        title: permanence.title,
        scheduledStartDate: permanence.scheduledStartDate.toISOString(),
        returnDate: permanence.returnDate ? permanence.returnDate.toISOString().split('T')[0] : '',
        notes: permanence.notes || '',
        ownerUserId: permanence.ownerUserId,
        deputyRemarks: permanence.deputyRemarks || '',
        locations: permanence.locations.map(l => ({
          ...l,
          dateStr: l.date.toISOString().split('T')[0],
          mairieContact: l.mairieContact ? {
            id: l.mairieContact.id,
            firstName: l.mairieContact.firstName,
            lastName: l.mairieContact.lastName,
            phone: l.mairieContact.mobilePhone || l.mairieContact.phone,
            email: l.mairieContact.email,
          } : null,
        }))
      }}
      users={users}
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
  )
}
