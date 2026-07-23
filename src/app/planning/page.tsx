import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PlanningGrid from './PlanningGrid'
import { calculateCounters, getReferencePeriodStart, getDefaultDayType, isSameDayUtc } from '@/lib/planning-utils'
import { isWeekend, isHoliday } from '@/lib/holidays'
import { hasPermission } from '@/lib/permissions'

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { month, year } = await searchParams
  
  const today = new Date()
  const currentMonth = month ? parseInt(month) : today.getUTCMonth()
  const currentYear = year ? parseInt(year) : today.getUTCFullYear()

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0))

  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } })
  const isMagaliOrAdmin = currentUser ? hasPermission(currentUser.role, 'MANAGE_PLANNING') : false

  const usersData = (await prisma.user.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    include: {
      employeeSetting: true,
      statuses: {
        where: {
          date: { gte: new Date(Date.UTC(currentYear - 2, 0, 1)) } // Charger depuis N-2 pour couvrir l'année de référence complète
        }
      }
    }
  })) as any[]

  const daysInMonth = endOfMonth.getUTCDate()

  const formattedUsers = usersData
    .filter(user => user.employeeSetting?.showInPlanning ?? true)
    .map(user => {
      const settings = user.employeeSetting || { annualWorkingDays: 218, annualPaidLeaveDays: 25, referencePeriodStartMonth: 6, referencePeriodStartDay: 1 }
      const refStart = getReferencePeriodStart(startOfMonth, settings.referencePeriodStartMonth, settings.referencePeriodStartDay)
      
      // Convertir les statuts en format utils
      const mappedStatuses = user.statuses.map((s: any) => ({ date: s.date, dayType: s.dayType }))

      // Compteurs annuels jusqu'à la fin du mois consulté (progression réelle)
      const refEnd = new Date(Date.UTC(refStart.getUTCFullYear() + 1, refStart.getUTCMonth(), refStart.getUTCDate() - 1))
      const maxCalculationDate = endOfMonth < refEnd ? endOfMonth : refEnd

      // Cumul des jours travaillés du 1er Juin jusqu'à la fin du mois affiché
      const yearCounters = calculateCounters(refStart, maxCalculationDate, mappedStatuses)
      
      // Congés pris sur l'ensemble de l'année de référence
      const fullYearCounters = calculateCounters(refStart, refEnd, mappedStatuses)
      
      // Compteurs du mois courant
      const monthCounters = calculateCounters(startOfMonth, endOfMonth, mappedStatuses)

      // Calendrier du mois courant pour l'affichage
      const monthCalendar = []
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(Date.UTC(currentYear, currentMonth, d))
        const dbStatus = user.statuses.find((s: any) => isSameDayUtc(s.date, date))
        const isWE = isWeekend(date)
        const isHol = isHoliday(date)
        
        monthCalendar.push({
          dateStr: date.toISOString(),
          dayType: dbStatus ? dbStatus.dayType : getDefaultDayType(date),
          isHoliday: isHol,
          isWeekend: isWE,
          notes: dbStatus?.notes || null
        })
      }

      const annualPaidLeaveDays = settings.annualPaidLeaveDays || 25
      const remainingWorked = Math.max(0, settings.annualWorkingDays - yearCounters.worked)
      const remainingPaidLeave = annualPaidLeaveDays - fullYearCounters.paidLeave

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email

      return {
        id: user.id,
        name: userName,
        email: user.email,
        role: user.role,
        showInPlanning: user.employeeSetting?.showInPlanning ?? true,
        counters: {
          workedMonth: monthCounters.worked,
          workedYear: yearCounters.worked,
          paidLeaveYear: yearCounters.paidLeave,
          annualDays: settings.annualWorkingDays,
          annualPaidLeaveDays,
          remainingWorked,
          remainingPaidLeave,
          remaining: remainingPaidLeave // pour compatibilité
        },
        monthCalendar
      }
    })

  // Récupérer les commentaires du planning pour ce mois
  const dbComments = await prisma.planningComment.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })

  const formattedComments = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(currentYear, currentMonth, d))
    const time = date.getTime()
    const dbComment = dbComments.find(c => c.date.getTime() === time)
    formattedComments.push({
      dateStr: date.toISOString(),
      content: dbComment ? dbComment.content : ''
    })
  }

  return (
    <PlanningGrid 
      users={formattedUsers} 
      currentYear={currentYear} 
      currentMonth={currentMonth} 
      isMagaliOrAdmin={isMagaliOrAdmin}
      initialComments={formattedComments}
    />
  )
}

