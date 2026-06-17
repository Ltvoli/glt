import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PermanenceHeader from './permanence-header'

export default async function PermanenceLayout({
  children,
  params
}: {
  children: React.ReactNode
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
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const serializedPermanence = {
    id: permanence.id,
    title: permanence.title,
    status: permanence.status,
    score: permanence.score,
    scheduledStartDate: permanence.scheduledStartDate.toISOString(),
    returnDate: permanence.returnDate ? permanence.returnDate.toISOString() : null,
    locations: permanence.locations.map(l => ({ communeName: l.communeName }))
  }

  return (
    <div>
      <PermanenceHeader permanence={serializedPermanence} />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem 1.5rem' }}>
        {children}
      </div>
    </div>
  )
}
