import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.read') && session.role !== 'SUPERADMIN')) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return new NextResponse('ID requis', { status: 400 })

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id },
    include: {
      ownerUser: true,
      locations: {
        include: {
          commune: true,
          mairieContact: { select: { firstName: true, lastName: true, phone: true, mobilePhone: true } }
        },
        orderBy: { order: 'asc' }
      },
      tasks: { orderBy: [{ section: 'asc' }, { order: 'asc' }] },
      contacts: { orderBy: { createdAt: 'asc' } },
      organizations: { orderBy: { createdAt: 'asc' } },
      synthesis: { include: { signedByUser: true } }
    }
  })

  if (!permanence) return new NextResponse('Introuvable', { status: 404 })

  // Build CSV content
  const lines: string[] = []

  const esc = (v: string | null | undefined) => `"${(v || '').replace(/"/g, '""')}"`

  // ---- RÉCAP ----
  lines.push('=== RÉCAPITULATIF ===')
  lines.push(`Titre,${esc(permanence.title)}`)
  lines.push(`Statut,${esc(permanence.status)}`)
  lines.push(`Date,${new Date(permanence.scheduledStartDate).toLocaleDateString('fr-FR')}`)
  lines.push(`Responsable,${esc(permanence.ownerUser.name)}`)
  lines.push(`Score,%${permanence.score}`)
  lines.push(`Remarques générales,${esc(permanence.deputyRemarks)}`)
  lines.push('')

  // ---- LIEUX ----
  lines.push('=== LIEUX DE PASSAGE ===')
  lines.push('Commune,Date,Début,Fin,Adresse,Stationnement,Contact Mairie,Notes')
  for (const loc of permanence.locations) {
    const contact = loc.mairieContact
      ? `${loc.mairieContact.firstName} ${loc.mairieContact.lastName} ${loc.mairieContact.mobilePhone || loc.mairieContact.phone || ''}`
      : ''
    lines.push([
      esc(loc.communeName),
      esc(new Date(loc.date).toLocaleDateString('fr-FR')),
      esc(loc.startTime),
      esc(loc.endTime),
      esc(loc.address),
      esc(loc.parkingStatus),
      esc(contact),
      esc(loc.locationNotes),
    ].join(','))
  }
  lines.push('')

  // ---- TÂCHES ----
  lines.push('=== TÂCHES ===')
  lines.push('Section,Tâche,Statut,Obligatoire,Assigné à,Commentaire')
  for (const task of permanence.tasks) {
    lines.push([
      esc(task.section),
      esc(task.label),
      esc(task.status),
      task.required ? '"Oui"' : '"Non"',
      esc(task.assigneeUserId || ''),
      esc(task.comment),
    ].join(','))
  }
  lines.push('')

  // ---- PHONING ----
  lines.push('=== PHONING ÉLECTEURS ===')
  lines.push('Nom,Prénom,Téléphone,Email,Ville,Statut appel,RDV,Résumé demande,Attention député')
  for (const c of permanence.contacts) {
    lines.push([
      esc(c.lastName),
      esc(c.firstName),
      esc(c.phone),
      esc(c.email),
      esc(c.city),
      esc(c.callStatus),
      c.callStatus === 'APPOINTMENT_CONFIRMED' ? '"Oui"' : '"Non"',
      esc(c.requestSummary),
      c.requiresDeputyAttention ? '"Oui"' : '"Non"',
    ].join(','))
  }
  lines.push('')

  // ---- COMMERÇANTS ----
  lines.push('=== COMMERÇANTS ===')
  lines.push('Organisation,Secteur,Attitude,Préoccupation,Visite recommandée,Visité')
  for (const o of permanence.organizations) {
    lines.push([
      esc(o.orgName),
      esc(o.sector),
      esc(o.attitude),
      esc(o.concern),
      o.visitRecommended ? '"Oui"' : '"Non"',
      o.visited ? '"Oui"' : '"Non"',
    ].join(','))
  }
  lines.push('')

  // ---- SYNTHÈSE ----
  lines.push('=== SYNTHÈSE DÉPUTÉ ===')
  if (permanence.synthesis) {
    const s = permanence.synthesis
    lines.push(`Points d'attention,${esc(s.attentionPoints)}`)
    lines.push(`Programme commerces,${esc(s.merchantProgram)}`)
    lines.push(`Informations commerçants,${esc(s.merchantInsights)}`)
    lines.push(`Sujets phoning,${esc(s.phoningTopics)}`)
    lines.push(`Recommandations,${esc(s.recommendations)}`)
    if (s.signedAt) {
      lines.push(`Signé par,${esc(s.signedByUser?.name)} le ${new Date(s.signedAt).toLocaleDateString('fr-FR')}`)
    }
  } else {
    lines.push('Aucune synthèse rédigée.')
  }

  const csv = '\uFEFF' + lines.join('\n') // BOM for Excel UTF-8

  const filename = `permanence_${permanence.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
