'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess, getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function updateContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const id = formData.get('id') as string
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

  const territorySector = formData.get('territorySector') as string
  const source = formData.get('source') as string
  const whatsappStatus = formData.get('whatsappStatus') as string
  const newsletter = formData.get('newsletter') === 'true'
  const linkedinUrl = formData.get('linkedinUrl') as string
  const notes = formData.get('notes') as string
  const tagsString = formData.get('tags') as string

  if (!id || !firstName || !lastName || !type) {
    return { error: 'Nom, prénom et type sont obligatoires.' }
  }

  let birthDate = null
  if (birthDateStr) {
    birthDate = new Date(birthDateStr)
  }

  try {
    const contact = await prisma.contact.findUnique({ where: { id } })
    
    if (!contact) {
      return { error: 'Contact introuvable.' }
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
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
        newsletter,
        linkedinUrl: linkedinUrl || null,
        notes: notes || null,
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

    redirect(`/contacts/${id}`)
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error
    return { error: 'Erreur lors de la mise à jour.' }
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
