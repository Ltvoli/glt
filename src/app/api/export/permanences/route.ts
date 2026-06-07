import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.userId || (!session.permissions.includes('permanences.export') && session.role !== 'SUPERADMIN')) {
    return new NextResponse('Non autorisé', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return new NextResponse('Identifiant manquant', { status: 400 })
  }

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null },
    include: {
      ownerUser: true,
      locations: true,
      tasks: {
        include: { assigneeUser: true },
        orderBy: { order: 'asc' }
      },
      contacts: true,
      organizations: true,
      synthesis: true
    }
  })

  if (!permanence) {
    return new NextResponse('Permanence introuvable', { status: 404 })
  }

  // Construct rows for CSV
  const rows: any[] = [
    ['=== INFORMATIONS GÉNÉRALES ==='],
    ['Titre', permanence.title],
    ['Statut', permanence.status],
    ['Score de préparation', `${permanence.score}%`],
    ['Date prévue', permanence.scheduledStartDate.toLocaleDateString('fr-FR')],
    ['Responsable', permanence.ownerUser.name],
    ['Notes', permanence.notes || ''],
    [''],
    ['=== COMMUNES & LIEUX ==='],
    ['Commune', 'Adresse', 'Heures', 'Parking'],
    ...permanence.locations.map(l => [
      l.communeName,
      l.address || '',
      `${l.startTime || '??'} - ${l.endTime || '??'}`,
      l.parkingStatus
    ]),
    [''],
    ['=== TÂCHES DE PRÉPARATION ==='],
    ['Section', 'Intitulé', 'Statut', 'Obligatoire', 'Assigné à', 'Commentaire'],
    ...permanence.tasks.map(t => [
      t.section.toUpperCase(),
      t.label,
      t.status,
      t.required ? 'Oui' : 'Non',
      t.assigneeUser?.name || 'Non assigné',
      t.comment || ''
    ]),
    [''],
    ['=== APPELS PHONING ==='],
    ['Prénom', 'Nom', 'Téléphone', 'Email', 'Statut d\'appel', 'Résumé demande', 'Signalement Député'],
    ...permanence.contacts.map(c => [
      c.firstName || '',
      c.lastName || '',
      c.phone || '',
      c.email || '',
      c.callStatus,
      c.requestSummary || '',
      c.requiresDeputyAttention ? 'Oui' : 'Non'
    ]),
    [''],
    ['=== PARCOURS DE COMMERCES ==='],
    ['Nom du commerce', 'Secteur', 'Attitude', 'Préoccupation', 'Recommandé', 'Visité'],
    ...permanence.organizations.map(o => [
      o.orgName || '',
      o.sector || '',
      o.attitude || '',
      o.concern || '',
      o.visitRecommended ? 'Oui' : 'Non',
      o.visited ? 'Oui' : 'Non'
    ]),
    [''],
    ['=== SYNTHÈSE D\'ACTIVITÉ ==='],
    ['Points d\'attention', permanence.synthesis?.attentionPoints || ''],
    ['Visite commerces', permanence.synthesis?.merchantProgram || ''],
    ['Sujets phoning', permanence.synthesis?.phoningTopics || ''],
    ['Recommandations', permanence.synthesis?.recommendations || ''],
    ['Signé par', permanence.synthesis?.signedAt ? 'Député' : 'Non signé']
  ]

  const csv = Papa.unparse(rows, { header: false })

  await logAudit('permanence.export', 'MobilePermanence', id, session.userId, { format: 'CSV' })

  return new NextResponse('\uFEFF' + csv, { // Include BOM for proper Excel UTF-8 display
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="permanence_${id}_export.csv"`,
    },
  })
}
