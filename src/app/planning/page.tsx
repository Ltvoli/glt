import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PlanningGrid from './PlanningGrid'
import { calculateCounters, getReferencePeriodStart, getDefaultDayType } from '@/lib/planning-utils'
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
    where: { archivedAt: null },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    include: {
      employeeSetting: true,
      statuses: {
        where: {
          date: { gte: new Date(Date.UTC(currentYear - 1, 0, 1)) } // Charger depuis le début de l'année précédente pour les compteurs
        }
      }
    }
  })) as any[]

  const daysInMonth = endOfMonth.getUTCDate()

  const formattedUsers = usersData.map(user => {
    const settings = user.employeeSetting || { annualWorkingDays: 218, referencePeriodStartMonth: 6, referencePeriodStartDay: 1 }
    const refStart = getReferencePeriodStart(startOfMonth, settings.referencePeriodStartMonth, settings.referencePeriodStartDay)
    
    // Convertir les statuts en format utils
    const mappedStatuses = user.statuses.map((s: any) => ({ date: s.date, dayType: s.dayType }))

    // Compteurs annuels
    // Pour simplifier et être précis, on calcule les jours écoulés entre refStart et le 31 mai suivant.
    const refEnd = new Date(Date.UTC(refStart.getUTCFullYear() + 1, refStart.getUTCMonth(), refStart.getUTCDate() - 1))
    
    // Le calcul se fait sur toute la période de référence
    const yearCounters = calculateCounters(refStart, refEnd, mappedStatuses)
    
    // Compteurs du mois
    const monthCounters = calculateCounters(startOfMonth, endOfMonth, mappedStatuses)

    // Calendrier du mois courant pour l'affichage
    const monthCalendar = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(currentYear, currentMonth, d))
      const time = date.getTime()
      const dbStatus = user.statuses.find((s: any) => s.date.getTime() === time)
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

    const remaining = settings.annualWorkingDays - yearCounters.worked

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      showInPlanning: user.employeeSetting?.showInPlanning ?? true,
      counters: {
        workedMonth: monthCounters.worked,
        workedYear: yearCounters.worked,
        paidLeaveYear: yearCounters.paidLeave,
        annualDays: settings.annualWorkingDays,
        remaining
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

