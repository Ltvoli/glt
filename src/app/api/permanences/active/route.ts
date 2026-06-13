import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

/**
 * GET /api/permanences/active
 * Returns active (non-archived, non-validated) permanences for the phoning picker in contacts table.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const permanences = await prisma.mobilePermanence.findMany({
    where: {
      archivedAt: null,
      status: { notIn: ['ARCHIVED', 'VALIDATED'] }
    },
    select: {
      id: true,
      title: true,
      scheduledStartDate: true,
      status: true,
    },
    orderBy: { scheduledStartDate: 'desc' },
    take: 20,
  })

  return NextResponse.json(permanences)
}
