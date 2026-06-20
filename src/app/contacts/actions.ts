'use server'

import prisma from '@/lib/prisma'
import { getSession, requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { contactSchema } from '@/lib/validations'
import { requirePermission } from '@/lib/permissions'

export async function createContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean, id?: string }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const usageName = formData.get('usageName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const mobilePhone = formData.get('mobilePhone') as string
  const type = formData.get('type') as string
  const city = formData.get('city') as string
  const gender = formData.get('gender') as string
  const birthDateStr = formData.get('birthDate') as string
  const apartment = formData.get('apartment') as string
  const building = formData.get('building') as string
  const streetNumber = formData.get('streetNumber') as string
  const streetName = formData.get('streetName') as string
  const addressComplement = formData.get('addressComplement') as string
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
  const profession = formData.get('profession') as string
  const isNpai = formData.get('isNpai') === 'true'
  const tagsString = formData.get('tags') as string

  // New fields
  const nationality = formData.get('nationality') as string
  const address = formData.get('address') as string
  const buildingType = formData.get('buildingType') as string
  const floor = formData.get('floor') as string
  const door = formData.get('door') as string
  const consentDateStr = formData.get('consentDate') as string
  const consentSource = formData.get('consentSource') as string
  const ageRange = formData.get('ageRange') as string
  const lastContactMobileStr = formData.get('lastContactMobile') as string
  const territory = formData.get('territory') as string
  const department = formData.get('department') as string

  const validatedFields = contactSchema.safeParse({
    firstName, lastName, usageName, email, phone, mobilePhone, type, city, gender,
    birthDate: birthDateStr,
    nationality, address,
    apartment, building, buildingType, floor, door,
    streetNumber, streetName, addressComplement, postalCode,
    supportLevel, meetingStep, territorySector, source, whatsappStatus, linkedinUrl, notes,
    profession, newsletter, smsConsent, consentDate: consentDateStr, consentSource,
    ageRange, lastContactMobile: lastContactMobileStr, territory, department,
    isNpai
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const validData = validatedFields.data

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
        firstName: validData.firstName,
        lastName: validData.lastName,
        usageName: validData.usageName || null,
        email: validData.email || null,
        phone: validData.phone || null,
        mobilePhone: validData.mobilePhone || null,
        type: validData.type,
        city: validData.city || null,
        gender: validData.gender || null,
        birthDate: validData.birthDate || null,
        nationality: validData.nationality || null,
        address: validData.address || null,
        apartment: validData.apartment || null,
        building: validData.building || null,
        buildingType: validData.buildingType || null,
        floor: validData.floor || null,
        door: validData.door || null,
        streetNumber: validData.streetNumber || null,
        streetName: validData.streetName || null,
        addressComplement: validData.addressComplement || null,
        postalCode: validData.postalCode || null,
        supportLevel: validData.supportLevel || null,
        territorySector: validData.territorySector || null,
        source: validData.source || null,
        whatsappStatus: validData.whatsappStatus || null,
        meetingStep: validData.meetingStep || null,
        newsletter: validData.newsletter,
        smsConsent: validData.smsConsent,
        consentDate: validData.consentDate || null,
        consentSource: validData.consentSource || null,
        linkedinUrl: validData.linkedinUrl || null,
        notes: validData.notes || null,
        profession: validData.profession || null,
        isNpai: validData.isNpai,
        ageRange: validData.ageRange || null,
        lastContactMobile: validData.lastContactMobile || null,
        territory: validData.territory || null,
        department: validData.department || null,
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

    return { success: true, id: newContact.id }
  } catch (error) {
    return { error: 'Erreur lors de la création du contact.' }
  }
}

export async function archiveContact(contactId: string): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }
  try {
    requirePermission(session.role, 'ARCHIVE_CONTACTS')
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

    await logAudit('ARCHIVE', 'Contact', contactId, session.userId, { archivedAt: archivedContact.archivedAt })
    
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de l\'archivage du contact.' }
  }
}

export async function archiveContactsBulk(
  ids: string[],
  filterParams: string,
  allFiltered: boolean
): Promise<{ error?: string; success?: boolean; count?: number }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }
  try {
    requirePermission(session.role, 'ARCHIVE_CONTACTS')
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    let whereClause: any

    if (allFiltered) {
      // Rebuild where from serialized filter params
      const sp = new URLSearchParams(filterParams)
      const andClauses: any[] = []
      whereClause = { archivedAt: null }

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
    } else {
      if (!ids || ids.length === 0) return { error: 'Aucun contact sélectionné.' }
      whereClause = { id: { in: ids }, archivedAt: null }
    }

    const result = await prisma.contact.updateMany({
      where: whereClause,
      data: { archivedAt: new Date() }
    })

    await logAudit(
      'BULK_ARCHIVE',
      'Contact',
      null,
      session.userId,
      { count: result.count, allFiltered, ids: allFiltered ? [] : ids }
    )

    return { success: true, count: result.count }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'archivage en masse.' }
  }
}

