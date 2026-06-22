'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess, getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { contactSchema } from '@/lib/validations'

export async function updateContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const id = formData.get('id') as string
  if (!id) return { error: 'Identifiant obligatoire.' }

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
    const contact = await prisma.contact.findUnique({ where: { id } })
    
    if (!contact) {
      return { error: 'Contact introuvable.' }
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
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
        meetingStep: validData.meetingStep || null,
        territorySector: validData.territorySector || null,
        source: validData.source || null,
        whatsappStatus: validData.whatsappStatus || null,
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
        updatedById: session.userId,
      }
    })

    if (tagsString !== null) {
      // Nettoyer les tags existants
      await prisma.contactTag.deleteMany({ where: { contactId: id } })
      
      const tagNames = tagsString.split(',').map(t => t.trim()).filter(t => t)
      for (const tagName of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, color: '#e2e8f0' }
        })
        await prisma.contactTag.create({
          data: { contactId: id, tagId: tag.id }
        })
      }
    }

    await logAudit('UPDATE', 'Contact', id, session.userId, updatedContact)

    return { success: true }
  } catch (error: any) {
    console.error('Error updating contact:', error)
    return { error: `Erreur lors de la mise à jour : ${error.message || error}` }
  }
}

export async function archiveContact(contactId: string) {
  const session = await requireWriteAccess()

  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact) throw new Error('Contact introuvable')

  await prisma.contact.update({
    where: { id: contactId },
    data: { archivedAt: new Date() }
  })

  await logAudit('ARCHIVE', 'Contact', contactId, session.userId)

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${contactId}`)
}
