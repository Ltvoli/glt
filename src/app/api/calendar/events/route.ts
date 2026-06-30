import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getNextOccurrenceDate } from '@/lib/generate-recurring-tasks'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')

  if (!startStr || !endStr) {
    return NextResponse.json({ error: 'Missing start or end' }, { status: 400 })
  }

  const startDate = new Date(startStr)
  const endDate = new Date(endStr)

  const [tasks, mails, permanences, recurringTemplates] = await Promise.all([
    // Tâches
    prisma.task.findMany({
      where: {
        dueDate: { gte: startDate, lte: endDate },
        status: { notIn: ['ANNULEE', 'TERMINEE'] },
        isTemplate: false
      },
      select: { id: true, title: true, dueDate: true, priority: true, isRecurring: true }
    }),
    // Courriers
    prisma.mailCase.findMany({
      where: {
        responseDueDate: { gte: startDate, lte: endDate },
        status: { notIn: ['CLASSE', 'REPONDU'] }
      },
      select: { id: true, subject: true, responseDueDate: true, reference: true, urgency: true }
    }),
    // Permanences
    prisma.mobilePermanence.findMany({
      where: {
        scheduledStartDate: { gte: startDate, lte: endDate },
        archivedAt: null
      },
      select: { id: true, title: true, scheduledStartDate: true, status: true }
    }),
    // Modèles de tâches récurrentes
    prisma.task.findMany({
      where: {
        isTemplate: true,
        isRecurring: true,
        nextOccurrence: { not: null }
      },
      select: { id: true, title: true, nextOccurrence: true, recurrencePattern: true, recurrenceInterval: true, priority: true }
    })
  ])

  const events: any[] = []

  // Mapper les tâches réelles
  tasks.forEach(t => {
    if (t.dueDate) {
      events.push({
        id: `task_${t.id}`,
        title: `${t.isRecurring ? '🔁 ' : ''}Tâche: ${t.title}`,
        start: t.dueDate.toISOString(),
        allDay: true,
        backgroundColor: t.priority === 'HAUTE' ? '#ef4444' : '#3b82f6',
        borderColor: t.priority === 'HAUTE' ? '#dc2626' : '#2563eb',
        extendedProps: { type: 'task', rawId: t.id }
      })
    }
  })

  // Mapper les occurrences virtuelles des tâches récurrentes
  recurringTemplates.forEach(tpl => {
    if (tpl.nextOccurrence) {
      let occurrenceDate = new Date(tpl.nextOccurrence)
      const pattern = tpl.recurrencePattern || 'DAILY'
      const interval = tpl.recurrenceInterval || 1
      let count = 0

      while (occurrenceDate <= endDate && count < 100) {
        if (occurrenceDate >= startDate) {
          events.push({
            id: `virtual_task_${tpl.id}_${occurrenceDate.getTime()}`,
            title: `🔄 Récurrente: ${tpl.title}`,
            start: occurrenceDate.toISOString(),
            allDay: true,
            editable: false,
            backgroundColor: tpl.priority === 'HAUTE' ? '#fee2e2' : '#dbeafe',
            borderColor: tpl.priority === 'HAUTE' ? '#f87171' : '#60a5fa',
            textColor: tpl.priority === 'HAUTE' ? '#b91c1c' : '#1d4ed8',
            extendedProps: { type: 'task', rawId: tpl.id, isVirtual: true }
          })
        }
        occurrenceDate = getNextOccurrenceDate(occurrenceDate, pattern, interval)
        count++
      }
    }
  })

  // Mapper les courriers
  mails.forEach(m => {
    if (m.responseDueDate) {
      events.push({
        id: `mail_${m.id}`,
        title: `Courrier: ${m.reference || m.subject}`,
        start: m.responseDueDate.toISOString(),
        allDay: true,
        backgroundColor: m.urgency === 'HAUTE' ? '#f59e0b' : '#64748b',
        borderColor: m.urgency === 'HAUTE' ? '#d97706' : '#475569',
        extendedProps: { type: 'mail', rawId: m.id }
      })
    }
  })

  // Mapper les permanences
  permanences.forEach(p => {
    if (p.scheduledStartDate) {
      events.push({
        id: `perm_${p.id}`,
        title: `Permanence: ${p.title}`,
        start: p.scheduledStartDate.toISOString(),
        allDay: true,
        backgroundColor: '#10b981',
        borderColor: '#059669',
        extendedProps: { type: 'permanence', rawId: p.id }
      })
    }
  })

  return NextResponse.json(events)
}
