import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateCounters, getReferencePeriodStart } from '@/lib/planning-utils'
import * as xlsx from 'xlsx'

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
    where: {
      isActive: true,
      archivedAt: null,
      NOT: [
        { firstName: { equals: 'Lionel', mode: 'insensitive' }, lastName: { equals: 'Tivoli', mode: 'insensitive' } },
        { firstName: { equals: 'Pierre', mode: 'insensitive' }, lastName: { equals: 'Deniau', mode: 'insensitive' } }
      ]
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' }
    ],
    include: {
      employeeSetting: true,
      statuses: {
        where: {
          date: { gte: new Date(Date.UTC(currentYear - 2, 0, 1)) }
        }
      }
    }
  })

  const wb = xlsx.utils.book_new()

  // --- Onglet 1 : Compteurs ---
  const countersData = [
    ['Collaborateur', 'Mois de référence', 'Travaillés (Mois)', 'Travaillés (Année)', 'CP Pris (Année)', 'Jours Restants']
  ]

  // --- Onglet 2 : Export Détail (Format Import) ---
  const detailData = [
    ['Email', 'Date', 'Statut', 'Notes']
  ]

  for (const user of usersData) {
    const settings = user.employeeSetting || { annualWorkingDays: 218, referencePeriodStartMonth: 6, referencePeriodStartDay: 1 }
    const refStart = getReferencePeriodStart(startOfMonth, settings.referencePeriodStartMonth, settings.referencePeriodStartDay)
    const refEnd = new Date(Date.UTC(refStart.getUTCFullYear() + 1, refStart.getUTCMonth(), refStart.getUTCDate() - 1))
    
    const mappedStatuses = user.statuses.map(s => ({ date: s.date, dayType: s.dayType }))
    
    const yearCounters = calculateCounters(refStart, refEnd, mappedStatuses)
    const monthCounters = calculateCounters(startOfMonth, endOfMonth, mappedStatuses)
    
    const remaining = settings.annualWorkingDays - yearCounters.worked

    const monthStr = startOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    countersData.push([
      user.name || '',
      monthStr,
      monthCounters.worked.toString(),
      yearCounters.worked.toString(),
      yearCounters.paidLeave.toString(),
      remaining.toString()
    ])

    // Ajouter les statuts détaillés du mois courant pour cet utilisateur
    const userMonthStatuses = user.statuses.filter(s => 
      s.date >= startOfMonth && s.date <= endOfMonth
    )
    
    for (const statusObj of userMonthStatuses) {
      // Format Date JJ/MM/AAAA
      const d = new Date(statusObj.date)
      const dateStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`
      
      detailData.push([
        user.email,
        dateStr,
        statusObj.status,
        statusObj.notes || ''
      ])
    }
  }

  const wsCounters = xlsx.utils.aoa_to_sheet(countersData)
  wsCounters['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }]
  xlsx.utils.book_append_sheet(wb, wsCounters, 'Compteurs')

  const wsDetail = xlsx.utils.aoa_to_sheet(detailData)
  wsDetail['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 40 }]
  xlsx.utils.book_append_sheet(wb, wsDetail, 'Export-Import')

  // --- Onglet 3 : Commentaires ---
  const dbComments = await prisma.planningComment.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    orderBy: {
      date: 'asc'
    }
  })

  const commentsSheetData = [
    ['Date', 'Commentaire / Réunion AP']
  ]
  for (const c of dbComments) {
    const d = new Date(c.date)
    const dateStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`
    commentsSheetData.push([
      dateStr,
      c.content
    ])
  }

  const wsComments = xlsx.utils.aoa_to_sheet(commentsSheetData)
  wsComments['!cols'] = [{ wch: 15 }, { wch: 60 }]
  xlsx.utils.book_append_sheet(wb, wsComments, 'Commentaires')

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Planning_Export_${currentYear}_${currentMonth + 1}.xlsx"`
    }
  })
}
