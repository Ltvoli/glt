import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseFullName } from '@/lib/mail-utils'
import { syncContactToBrevo } from '@/lib/brevo'
import { generateReference } from '@/app/mails/actions'

function extractEmailFromString(str: string): string | null {
  const match = str.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  if (str.includes('@')) return str.trim()
  return null
}

function extractNameFromString(str: string): string {
  const match = str.match(/^([^<]+)/)
  if (match) return match[1].trim()
  return str.split('@')[0] || ''
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const expectedToken = process.env.WEBHOOK_SECRET || 'dev-secret'

    if (token !== expectedToken) {
      console.warn(`[INBOUND WEBHOOK] Tentative d'accès non autorisée avec le token: ${token}`)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer un utilisateur système (le premier admin ou utilisateur) pour remplir les contraintes d'intégrité de la base de données
    const fallbackUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    const systemUserId = fallbackUser?.id || (await prisma.user.findFirst())?.id
    if (!systemUserId) {
      console.error("[INBOUND WEBHOOK] Erreur: Impossible de créer un contact car aucun utilisateur n'existe en base de données.")
      return NextResponse.json({ error: 'Database has no users' }, { status: 500 })
    }

    const payload = await req.json()
    console.log('[INBOUND WEBHOOK] Requête reçue :', JSON.stringify(payload, null, 2))

    // Brevo Inbound Parse peut envoyer les emails dans un tableau 'items' ou directement à la racine
    const items = Array.isArray(payload.items) ? payload.items : [payload]

    const processedMails = []

    for (const item of items) {
      const senderObj = item.sender
      let rawEmail = item.email || ''
      let rawName = ''

      if (senderObj && typeof senderObj === 'object') {
        rawEmail = senderObj.email || rawEmail
        rawName = senderObj.name || ''
      } else if (senderObj && typeof senderObj === 'string') {
        rawEmail = extractEmailFromString(senderObj) || rawEmail
        rawName = extractNameFromString(senderObj)
      }

      if (!rawEmail) {
        console.warn('[INBOUND WEBHOOK] Email de l\'expéditeur manquant, email ignoré.')
        continue
      }

      const email = rawEmail.toLowerCase().trim()
      console.log(`[INBOUND WEBHOOK] Expéditeur résolu : ${email} (${rawName})`)

      // 1. Résoudre ou créer le contact
      let contact = await prisma.contact.findFirst({
        where: { email, archivedAt: null }
      })

      if (!contact) {
        const nameStr = rawName.trim() || extractNameFromString(email)
        const { firstName, lastName } = parseFullName(nameStr)

        contact = await prisma.contact.create({
          data: {
            email,
            firstName,
            lastName: lastName || 'INCONNU',
            type: 'CITOYEN',
            notes: `Créé automatiquement lors de la réception d'un e-mail entrant (Inbound Parse Brevo).`,
            createdById: systemUserId
          }
        })

        console.log(`[INBOUND WEBHOOK] Nouveau contact créé : ${contact.firstName} ${contact.lastName} (ID: ${contact.id})`)
        await logAudit('CREATE', 'Contact', contact.id, systemUserId, contact)

        // Optionnel : synchroniser de nouveau vers Brevo
        try {
          await syncContactToBrevo(contact.id)
        } catch (e) {
          console.error('[INBOUND WEBHOOK] Erreur synchronisation Brevo contact :', e)
        }
      }

      // 2. Créer le courrier entrant
      const subject = item.subject || 'E-mail sans objet'
      const textContent = item.body || item.textBody || item.htmlBody || ''
      const reference = await generateReference()

      const newMail = await prisma.mailCase.create({
        data: {
          reference,
          subject,
          type: 'ENTRANT',
          status: 'RECU',
          urgency: 'NORMALE',
          channel: 'EMAIL',
          receiveDate: new Date(),
          content: textContent,
          senderName: `${contact.firstName} ${contact.lastName}`
        }
      })

      console.log(`[INBOUND WEBHOOK] Nouveau courrier créé : ${newMail.reference} (ID: ${newMail.id})`)
      await logAudit('CREATE', 'MailCase', newMail.id, systemUserId, newMail)

      // 3. Lier le courrier au contact
      await prisma.globalLink.create({
        data: {
          contactId: contact.id,
          mailCaseId: newMail.id
        }
      })

      // 4. Déclencher l'analyse automatique par l'IA Gemini
      try {
        const { analyzeIncomingMail } = await import('@/lib/gemini')
        if (textContent.trim()) {
          const aiResult = await analyzeIncomingMail(textContent, 'text/plain')
          console.log(`[INBOUND WEBHOOK] Analyse IA terminée pour ${newMail.reference}`)

          // Enregistrer l'analyse
          await prisma.mailCase.update({
            where: { id: newMail.id },
            data: {
              aiAnalysis: aiResult,
              aiSuggestions: aiResult.pistes_reponse || []
            }
          })

          // Appliquer automatiquement les catégories extraites
          const metadata = aiResult.metadata || {}
          const analyseDetails = aiResult.analyse || {}
          const updateData: any = {}

          if (metadata.objet) {
            updateData.subject = metadata.objet
          }
          if (metadata.commune) {
            updateData.city = metadata.commune
          }
          if (analyseDetails.urgence) {
            updateData.urgency = analyseDetails.urgence === 'élevée' ? 'HAUTE' : 'NORMALE'
          }
          if (analyseDetails.type_courrier) {
            switch (analyseDetails.type_courrier) {
              case 'demande_intervention':
              case 'demande_soutien':
                updateData.category = 'DEMANDE_INTERVENTION'
                break
              case 'invitation':
              case 'demande_rdv':
                updateData.category = 'INVITATION'
                break
              case 'reclamation':
                updateData.category = 'RECLAMATION'
                break
              case 'autre':
              default:
                updateData.category = 'INFORMATION'
                break
            }
          }

          await prisma.mailCase.update({
            where: { id: newMail.id },
            data: updateData
          })
          console.log(`[INBOUND WEBHOOK] Métadonnées appliquées automatiquement à ${newMail.reference}`)
        }
      } catch (ae) {
        console.error(`[INBOUND WEBHOOK] Échec de l'analyse automatique pour ${newMail.reference} :`, ae)
      }

      // 5. Déclencher les tâches de workflow automatique
      try {
        const { triggerMailCaseWorkflows } = await import('@/app/mails/actions')
        await triggerMailCaseWorkflows(newMail.id, systemUserId)
        console.log(`[INBOUND WEBHOOK] Workflows déclenchés avec succès pour ${newMail.reference}`)
      } catch (we) {
        console.error(`[INBOUND WEBHOOK] Échec du déclenchement du workflow pour ${newMail.reference} :`, we)
      }

      processedMails.push(newMail.reference)
    }

    return NextResponse.json({ success: true, processed: processedMails })
  } catch (err: any) {
    console.error('[INBOUND WEBHOOK] Erreur générale :', err)
    return NextResponse.json({ error: `Erreur interne : ${err.message || err}` }, { status: 500 })
  }
}
