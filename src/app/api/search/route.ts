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
        archivedAt: null,
        OR: [
          { firstName:   { contains: term, mode: 'insensitive' } },
          { lastName:    { contains: term, mode: 'insensitive' } },
          { usageName:   { contains: term, mode: 'insensitive' } },
          { email:       { contains: term, mode: 'insensitive' } },
          { mobilePhone: { contains: term, mode: 'insensitive' } },
          { phone:       { contains: term, mode: 'insensitive' } },
          { city:        { contains: term, mode: 'insensitive' } },
          { streetName:  { contains: term, mode: 'insensitive' } },
        ]
      },
      select: { id: true, firstName: true, lastName: true, usageName: true, city: true, email: true, mobilePhone: true },
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { title:       { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ]
      },
      select: { id: true, title: true, status: true, priority: true },
      take: 6,
    }),
    prisma.mailCase.findMany({
      where: {
        OR: [
          { reference:     { contains: term, mode: 'insensitive' } },
          { subject:       { contains: term, mode: 'insensitive' } },
          { senderName:    { contains: term, mode: 'insensitive' } },
          { recipientName: { contains: term, mode: 'insensitive' } },
          { city:          { contains: term, mode: 'insensitive' } },
          { documents:     { some: { extractedText: { contains: term, mode: 'insensitive' } } } }
        ]
      },
      select: { id: true, reference: true, subject: true, status: true, type: true },
      take: 6,
    }),
    prisma.writtenQuestion.findMany({
      where: {
        OR: [
          { anNumber: { contains: term, mode: 'insensitive' } },
          { title:    { contains: term, mode: 'insensitive' } },
          { ministry: { contains: term, mode: 'insensitive' } },
          { theme:    { contains: term, mode: 'insensitive' } },
        ]
      },
      select: { id: true, anNumber: true, title: true, ministry: true, status: true },
      take: 6,
    }),
  ])

  return NextResponse.json({ contacts, tasks, mails, qe })
}
