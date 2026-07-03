'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { sendBrevoEmail } from '@/lib/brevo'

async function resolveContacts(target: { ids?: string[]; listId?: string; all?: boolean; filterParams?: string }): Promise<any[]> {
  if (target.listId) {
    const list = await prisma.contactList.findUnique({
      where: { id: target.listId },
      include: {
        contacts: {
          where: { archivedAt: null }
        }
      }
    })
    return list?.contacts || []
  }

  if (target.ids && target.ids.length > 0) {
    return await prisma.contact.findMany({
      where: {
        id: { in: target.ids },
        archivedAt: null
      }
    })
  }

  if (target.all && target.filterParams) {
    const sp = new URLSearchParams(target.filterParams)
    const andClauses: any[] = []
    const whereClause: any = { archivedAt: null }

    const nameQ = sp.get('nameQ')
    if (nameQ) {
      for (const term of nameQ.split(',').filter(Boolean)) {
        andClauses.push({ OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName:  { contains: term, mode: 'insensitive' } },
        ]})
      }
    }
    const city = sp.get('city')
    if (city) {
      const cities = city.split(',').filter(Boolean)
      if (cities.length === 1) whereClause.city = { equals: cities[0], mode: 'insensitive' }
      else andClauses.push({ OR: cities.map(c => ({ city: { equals: c, mode: 'insensitive' } })) })
    }
    const q = sp.get('q')
    if (q) {
      andClauses.push({ OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { city:      { contains: q, mode: 'insensitive' } },
      ]})
    }
    if (andClauses.length > 0) whereClause.AND = andClauses

    return await prisma.contact.findMany({
      where: whereClause
    })
  }

  return []
}

export async function sendBulkCommunicationAction(
  channel: 'EMAIL' | 'SMS',
  subject: string | null,
  content: string,
  target: { ids?: string[]; listId?: string; all?: boolean; filterParams?: string }
): Promise<{ success: boolean; error?: string; sentCount?: number; failedCount?: number }> {
  try {
    const session = await requireWriteAccess()

    if (!channel || (channel !== 'EMAIL' && channel !== 'SMS')) {
      return { success: false, error: 'Canal invalide.' }
    }

    if (channel === 'EMAIL' && (!subject || !subject.trim())) {
      return { success: false, error: 'Le sujet est obligatoire pour un envoi par Email.' }
    }

    if (!content || !content.trim()) {
      return { success: false, error: 'Le contenu du message est obligatoire.' }
    }

    // 1. Resolve contacts
    const contacts = await resolveContacts(target)

    if (contacts.length === 0) {
      return { success: false, error: 'Aucun contact destinataire trouvé.' }
    }

    // 2. Filter valid contacts
    const validContacts = contacts.filter(contact => {
      if (channel === 'EMAIL') {
        return contact.email && contact.email.trim() !== ''
      } else {
        return contact.mobilePhone && contact.mobilePhone.trim() !== ''
      }
    })

    const failedCount = contacts.length - validContacts.length

    // 3. Create the bulk communication record
    const bulkComm = await prisma.bulkCommunication.create({
      data: {
        subject: (channel === 'EMAIL' && subject) ? subject.trim() : null,
        content: content.trim(),
        channel,
        sentCount: contacts.length,
        successCount: validContacts.length,
        failedCount,
        createdById: session.userId
      }
    })

    // 4. Simulate sending and record audit logs
    for (const contact of validContacts) {
      const personalizedContent = content
        .replace(/{firstName}/g, contact.firstName || '')
        .replace(/{lastName}/g, contact.lastName || '')
        .replace(/{city}/g, contact.city || '')
        .replace(/{email}/g, contact.email || '')
        .replace(/{phone}/g, contact.mobilePhone || contact.phone || '')

      const recipient = channel === 'EMAIL' ? contact.email : contact.mobilePhone

      if (channel === 'EMAIL' && recipient) {
        try {
          const htmlContent = personalizedContent.replace(/\n/g, '<br />')
          await sendBrevoEmail(
            recipient,
            `${contact.firstName} ${contact.lastName}`,
            subject || "Communication — BP-Lionel Tivoli",
            htmlContent
          )
        } catch (e) {
          console.error(`[BULK EMAIL] Erreur lors de l'envoi à ${recipient}:`, e)
        }
      } else {
        console.log(`[SIMULATION ENVOI ${channel}] pour ${contact.firstName} ${contact.lastName} (${recipient}) : ${personalizedContent}`)
      }

      // Enregistrement d'un log d'interaction/audit sur la fiche de contact
      await logAudit(
        `SEND_BULK_${channel}`,
        'Contact',
        contact.id,
        session.userId,
        {
          bulkCommunicationId: bulkComm.id,
          channel,
          subject: channel === 'EMAIL' ? subject : null,
          recipient,
          content: personalizedContent
        }
      )
    }

    // Log the general campaign audit
    await logAudit(
      'SEND_BULK_COMMUNICATION',
      'BulkCommunication',
      bulkComm.id,
      session.userId,
      {
        channel,
        totalTarget: contacts.length,
        successCount: validContacts.length,
        failedCount
      }
    )

    revalidatePath('/contacts/communications')
    return {
      success: true,
      sentCount: validContacts.length,
      failedCount
    }
  } catch (err: any) {
    console.error('Error in sendBulkCommunicationAction:', err)
    return { success: false, error: err.message || 'Erreur interne lors de l\'envoi.' }
  }
}

export async function getMessageTemplates(channel: 'EMAIL' | 'SMS') {
  try {
    return await prisma.messageTemplate.findMany({
      where: {
        channel,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  } catch (err) {
    console.error('Error fetching message templates:', err)
    return []
  }
}
