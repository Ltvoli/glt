import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ count: 0 })
  }

  const count = await prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  })

  return NextResponse.json({ count })
}
