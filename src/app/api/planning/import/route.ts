import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hasPermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

function getDayTypeFromStatus(status: string): string {
  const s = status.toUpperCase()
  if (['PARIS', 'CIRCO', 'TELETRAVAIL', 'DEPLACEMENT', 'TRAVAILLÉ', 'TRAVAILLE'].includes(s)) return 'worked'
  if (['CONGE', 'CONGÉ', 'CONGE PAYE', 'CONGÉ PAYÉ'].includes(s)) return 'paid_leave'
  return 'off' // MALADIE, ABSENT, NON TRAVAILLÉ, NON TRAVAILLE ou autre
}

// Fonction pour parser les dates Excel (numéro de série) ou chaîne de caractères
function parseExcelDate(dateVal: any): Date | null {
  if (!dateVal) return null
  
  if (typeof dateVal === 'number') {
    // Excel date (jours depuis le 1er janvier 1900)
    // -25569 = différence de jours entre 1900 et 1970
    // +1 ou -1 jour de décalage à gérer (leap year bug d'Excel)
    const utcDays = Math.floor(dateVal - 25569)
    const utcValue = utcDays * 86400 * 1000
    const d = new Date(utcValue)
    // Force to UTC midnight
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }

  if (typeof dateVal === 'string') {
    // Essaie de parser JJ/MM/AAAA ou AAAA-MM-JJ
    const parts = dateVal.split(/[-/]/)
    if (parts.length === 3) {
      // Si format européen JJ/MM/AAAA
      if (parts[2].length === 4) {
        return new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])))
      }
      // Si format ISO AAAA-MM-JJ
      if (parts[0].length === 4) {
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])))
      }
    }
    const d = new Date(dateVal)
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!currentUser || !hasPermission(currentUser.role, 'MANAGE_PLANNING')) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Extrait les données sous forme de tableau d'objets ou de tableau de tableaux
    const data: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (data.length < 2) {
      return NextResponse.json({ error: 'Fichier vide ou sans données' }, { status: 400 })
    }

    // On suppose que la ligne 0 contient les headers (Email, Date, Statut, Notes)
    const rows = data.slice(1)
    
    // Récupérer tous les emails pour trouver les IDs correspondants
    const emailsInFile = Array.from(new Set(rows.map(row => (row[0] || '').toString().trim().toLowerCase()).filter(Boolean)))
    
    const users = await prisma.user.findMany({
      where: { email: { in: emailsInFile } },
      select: { id: true, email: true }
    })
    
    const emailToIdMap = new Map(users.map(u => [u.email.toLowerCase(), u.id]))

    let successCount = 0
    let errorCount = 0

    // Pour des raisons de performance et pour éviter les verrous massifs, 
    // on traite les lignes par lots ou séquentiellement
    for (const row of rows) {
      const email = (row[0] || '').toString().trim().toLowerCase()
      const dateVal = row[1]
      const statusRaw = (row[2] || '').toString().trim()
      const notes = (row[3] || '').toString().trim()

      if (!email || !dateVal || !statusRaw) continue // Ligne incomplète

      const userId = emailToIdMap.get(email)
      if (!userId) {
        errorCount++
        continue
      }

      const date = parseExcelDate(dateVal)
      if (!date) {
        errorCount++
        continue
      }

      const dayType = getDayTypeFromStatus(statusRaw)

      await prisma.employeeStatus.upsert({
        where: {
          employeeId_date: {
            employeeId: userId,
            date: date
          }
        },
        update: {
          status: statusRaw.toUpperCase(),
          dayType,
          notes: notes || null,
          updatedById: session.userId
        },
        create: {
          employeeId: userId,
          date: date,
          status: statusRaw.toUpperCase(),
          dayType,
          notes: notes || null,
          updatedById: session.userId
        }
      })
      successCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import terminé : ${successCount} statuts mis à jour, ${errorCount} erreurs ignorées (ex: email introuvable ou date invalide).` 
    })

  } catch (error) {
    console.error("Planning import error:", error)
    return NextResponse.json({ error: 'Erreur lors de l\'importation' }, { status: 500 })
  }
}
