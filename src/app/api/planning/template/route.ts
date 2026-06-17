import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hasPermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

export async function GET() {
  const session = await getSession()
  if (!session) return new NextResponse('Non authentifié', { status: 401 })

  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!currentUser || !hasPermission(currentUser.role, 'MANAGE_PLANNING')) {
    return new NextResponse('Permission refusée', { status: 403 })
  }

  // Création du workbook et de la worksheet
  const wb = xlsx.utils.book_new()
  
  // Données d'exemple
  const wsData = [
    ['Email', 'Date', 'Statut', 'Notes'],
    ['j.dupont@cdc.fr', '15/06/2026', 'Congé payé', 'Vacances d\'été'],
    ['a.martin@cdc.fr', '16/06/2026', 'Travaillé', 'Présent en circo'],
    ['m.dubois@cdc.fr', '17/06/2026', 'Maladie', ''],
  ]
  
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  
  // Ajustement de la largeur des colonnes
  ws['!cols'] = [
    { wch: 30 }, // Email
    { wch: 15 }, // Date
    { wch: 20 }, // Statut
    { wch: 40 }  // Notes
  ]

  xlsx.utils.book_append_sheet(wb, ws, 'Modèle Import Planning')

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Modele_Import_Planning.xlsx"'
    }
  })
}
