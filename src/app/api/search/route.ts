import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ contacts: [], tasks: [], mails: [], qe: [] })
  }

  const term = q.trim()

  const [contacts, tasks, mails, qe] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { email: { contains: term } },
          { phone: { contains: term } },
          { city: { contains: term } }
        ]
      },
      take: 10
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: term } },
          { description: { contains: term } }
        ]
      },
      take: 10
    }),
    prisma.mailCase.findMany({
      where: {
        OR: [
          { reference: { contains: term } },
          { subject: { contains: term } },
          { senderName: { contains: term } },
          { recipientName: { contains: term } },
          { city: { contains: term } }
        ]
      },
      take: 10
    }),
    prisma.writtenQuestion.findMany({
      where: {
        OR: [
          { anNumber: { contains: term } },
          { title: { contains: term } },
          { ministry: { contains: term } },
          { theme: { contains: term } }
        ]
      },
      take: 10
    })
  ])

  return NextResponse.json({ contacts, tasks, mails, qe })
}
