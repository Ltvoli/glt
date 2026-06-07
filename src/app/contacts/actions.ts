'use server'

import prisma from '@/lib/prisma'
import { getSession, requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'

export async function createContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const mobilePhone = formData.get('mobilePhone') as string
  const type = formData.get('type') as string
  const city = formData.get('city') as string
  const gender = formData.get('gender') as string
  const birthDateStr = formData.get('birthDate') as string
  const streetNumber = formData.get('streetNumber') as string
  const streetName = formData.get('streetName') as string
  const postalCode = formData.get('postalCode') as string
  const supportLevel = formData.get('supportLevel') as string
  const meetingStep = formData.get('meetingStep') as string

  const territorySector = formData.get('territorySector') as string
  const source = formData.get('source') as string
  const whatsappStatus = formData.get('whatsappStatus') as string
  const newsletter = formData.get('newsletter') === 'true'
  const smsConsent = formData.get('smsConsent') === 'true'
  const linkedinUrl = formData.get('linkedinUrl') as string
  const notes = formData.get('notes') as string
  const tagsString = formData.get('tags') as string

  if (!firstName || !lastName || !type) {
    return { error: 'Nom, prénom et type sont obligatoires.' }
  }

  let birthDate = null
  if (birthDateStr) {
    birthDate = new Date(birthDateStr)
  }

  try {
    // Détection de doublons potentiels
    const potentialDuplicates = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || 'FAKE_EMAIL_NIL' },
          { phone: phone || 'FAKE_PHONE_NIL' },
          { mobilePhone: mobilePhone || 'FAKE_MOBILE_NIL' }
        ],
        AND: {
          lastName: { equals: lastName }
        }
      }
    })

    const newContact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        mobilePhone: mobilePhone || null,
        type,
        city: city || null,
        gender: gender || null,
        birthDate,
        streetNumber: streetNumber || null,
        streetName: streetName || null,
        postalCode: postalCode || null,
        supportLevel: supportLevel || null,
        territorySector: territorySector || null,
        source: source || null,
        whatsappStatus: whatsappStatus || null,
        meetingStep: meetingStep || null,
        newsletter,
        smsConsent,
        linkedinUrl: linkedinUrl || null,
        notes: notes || null,
        createdById: session.userId,
      }
    })

    // Traitement des tags (séparés par des virgules)
    if (tagsString) {
      const tagNames = tagsString.split(',').map(t => t.trim()).filter(t => t)
      for (const tagName of tagNames) {
        // Upsert the tag
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, color: '#e2e8f0' }
        })
        // Link to contact
        await prisma.contactTag.create({
          data: {
            contactId: newContact.id,
            tagId: tag.id
          }
        })
      }
    }

    // Enregistrement des doublons s'il y en a
    if (potentialDuplicates.length > 0) {
      for (const dup of potentialDuplicates) {
        await prisma.duplicateCandidate.create({
          data: {
            contact1Id: dup.id,
            contact2Id: newContact.id,
            reason: dup.email === email ? 'NOM_EMAIL' : 'NOM_PHONE'
          }
        })
      }
    }

    await logAudit('CREATE', 'Contact', newContact.id, session.userId, newContact)

  } catch (error) {
    return { error: 'Erreur lors de la création du contact.' }
  }

  redirect('/contacts')
}

export async function archiveContact(contactId: string): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) return { error: 'Contact introuvable.' }

    const archivedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { archivedAt: new Date() }
    })

    await logAudit('ARCHIVE', 'Contact', contactId, session.userId, undefined, { archivedAt: archivedContact.archivedAt })
    
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de l\'archivage du contact.' }
  }
}
