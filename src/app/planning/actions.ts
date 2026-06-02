'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function upsertEmployeeStatus(dateStr: string, status: string, notes?: string) {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  // Normaliser la date à 00:00:00 locale
  const d = new Date(dateStr)
  const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

  await prisma.employeeStatus.upsert({
    where: {
      employeeId_date: {
        employeeId: session.userId,
        date: normalizedDate
      }
    },
    update: {
      status,
      notes
    },
    create: {
      employeeId: session.userId,
      date: normalizedDate,
      status,
      notes
    }
  })

  // Revalider le dashboard et la page planning
  revalidatePath('/')
  revalidatePath('/planning')
}

export async function upsertWeeklyStatus(userId: string, weekDays: { dateStr: string, status: string }[]) {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  for (const day of weekDays) {
    if (!day.status) continue // Ignorer si pas de statut choisi

    const d = new Date(day.dateStr)
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

    await prisma.employeeStatus.upsert({
      where: {
        employeeId_date: {
          employeeId: userId,
          date: normalizedDate
        }
      },
      update: { status: day.status },
      create: {
        employeeId: userId,
        date: normalizedDate,
        status: day.status
      }
    })
  }

  revalidatePath('/planning')
}
