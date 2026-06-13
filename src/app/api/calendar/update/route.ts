import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.userId) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const { id, start } = await request.json()
    if (!id || !start) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    const newDate = new Date(start)

    if (id.startsWith('task_')) {
      const rawId = id.replace('task_', '')
      await prisma.task.update({
        where: { id: rawId },
        data: { dueDate: newDate }
      })
    } else if (id.startsWith('mail_')) {
      const rawId = id.replace('mail_', '')
      await prisma.mailCase.update({
        where: { id: rawId },
        data: { responseDueDate: newDate }
      })
    } else if (id.startsWith('perm_')) {
      const rawId = id.replace('perm_', '')
      await prisma.mobilePermanence.update({
        where: { id: rawId },
        data: { scheduledStartDate: newDate }
      })
    } else {
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar update error:', error)
    return NextResponse.json({ error: 'Failed to update date' }, { status: 500 })
  }
}
