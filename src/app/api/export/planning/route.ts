import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateCounters, getReferencePeriodStart } from '@/lib/planning-utils'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')

  const today = new Date()
  const currentMonth = monthParam ? parseInt(monthParam) : today.getUTCMonth()
  const currentYear = yearParam ? parseInt(yearParam) : today.getUTCFullYear()

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0))

  const usersData = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      employeeSetting: true,
      statuses: {
        where: {
          date: { gte: new Date(Date.UTC(currentYear - 2, 0, 1)) }
        }
      }
    }
  })

  // Préparer le CSV
  let csvContent = 'Collaborateur,Mois de référence,Travaillés (Mois),Travaillés (Année),CP Pris (Année),Jours Restants\n'

  for (const user of usersData) {
    const settings = user.employeeSetting || { annualWorkingDays: 218, referencePeriodStartMonth: 6, referencePeriodStartDay: 1 }
    const refStart = getReferencePeriodStart(startOfMonth, settings.referencePeriodStartMonth, settings.referencePeriodStartDay)
    const refEnd = new Date(Date.UTC(refStart.getUTCFullYear() + 1, refStart.getUTCMonth(), refStart.getUTCDate() - 1))
    
    const mappedStatuses = user.statuses.map(s => ({ date: s.date, dayType: s.dayType }))
    
    const yearCounters = calculateCounters(refStart, refEnd, mappedStatuses)
    const monthCounters = calculateCounters(startOfMonth, endOfMonth, mappedStatuses)
    
    const remaining = settings.annualWorkingDays - yearCounters.worked

    const monthStr = startOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const row = `"${user.name}","${monthStr}",${monthCounters.worked},${yearCounters.worked},${yearCounters.paidLeave},${remaining}`
    csvContent += row + '\n'
  }

  // BOM pour Excel
  const bom = '\uFEFF'
  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="export_planning_${currentYear}_${currentMonth + 1}.csv"`
    }
  })
}
