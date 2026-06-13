'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess, getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

// Déduire le dayType du status classique
function getDayTypeFromStatus(status: string): string {
  if (['PARIS', 'CIRCO', 'TELETRAVAIL', 'DEPLACEMENT'].includes(status)) return 'worked'
  if (['CONGE'].includes(status)) return 'paid_leave'
  return 'off' // MALADIE, ABSENT ou autre
}

export async function upsertEmployeeStatus(dateStr: string, status: string, notes?: string) {
  const session = await requireWriteAccess()

  // Normaliser la date à 00:00:00 locale
  const d = new Date(dateStr)
  const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayType = getDayTypeFromStatus(status)

  await prisma.employeeStatus.upsert({
    where: {
      employeeId_date: {
        employeeId: session.userId,
        date: normalizedDate
      }
    },
    update: {
      status,
      dayType,
      notes,
      updatedById: session.userId
    },
    create: {
      employeeId: session.userId,
      date: normalizedDate,
      status,
      dayType,
      notes,
      updatedById: session.userId
    }
  })

  // Audit Log
  await logAudit('UPDATE', 'EmployeeStatus', `${session.userId}-${normalizedDate.toISOString()}`, session.userId, { status, dayType, notes })

  revalidatePath('/')
  revalidatePath('/planning')
}

export async function upsertWeeklyStatus(userId: string, weekDays: { dateStr: string, status: string }[]) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_PLANNING')

  for (const day of weekDays) {
    if (!day.status) continue // Ignorer si pas de statut choisi

    const d = new Date(day.dateStr)
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const dayType = getDayTypeFromStatus(day.status)

    await prisma.employeeStatus.upsert({
      where: {
        employeeId_date: {
          employeeId: userId,
          date: normalizedDate
        }
      },
      update: { status: day.status, dayType, updatedById: session.userId },
      create: {
        employeeId: userId,
        date: normalizedDate,
        status: day.status,
        dayType,
        updatedById: session.userId
      }
    })
  }

  revalidatePath('/planning')
}

export async function updateEmployeeDayType(employeeId: string, dateStr: string, dayType: string, notes?: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_PLANNING')
  
  const d = new Date(dateStr)
  const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

  await prisma.employeeStatus.upsert({
    where: {
      employeeId_date: { employeeId, date: normalizedDate }
    },
    update: {
      dayType,
      status: dayType === 'worked' ? 'PRESENCE' : dayType === 'paid_leave' ? 'CONGE' : 'ABSENT',
      notes,
      updatedById: session.userId
    },
    create: {
      employeeId,
      date: normalizedDate,
      dayType,
      status: dayType === 'worked' ? 'PRESENCE' : dayType === 'paid_leave' ? 'CONGE' : 'ABSENT',
      notes,
      updatedById: session.userId
    }
  })

  // Audit Log
  await logAudit(
    'UPDATE_DAYTYPE',
    'EmployeeStatus',
    `${employeeId}-${normalizedDate.toISOString()}`,
    session.userId,
    { dayType, notes }
  )

  revalidatePath('/planning')
}

export async function upsertEmployeeSetting(employeeId: string, annualWorkingDays: number) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'EDIT_QUOTAS')

  await prisma.employeeSetting.upsert({
    where: { userId: employeeId },
    update: { annualWorkingDays },
    create: { userId: employeeId, annualWorkingDays }
  })

  await logAudit(
    'UPDATE_SETTING',
    'EmployeeSetting',
    employeeId,
    session.userId,
    { annualWorkingDays }
  )

  revalidatePath('/planning/settings')
  revalidatePath('/planning')
}
