'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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
        updatedById: session.userId,
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Contact',
        entityId: id,
        userId: session.userId,
        oldValues: JSON.stringify(contact),
        newValues: JSON.stringify(updatedContact)
      }
    })

  } catch (error) {
    return { error: 'Erreur lors de la mise à jour.' }
  }

  revalidatePath(`/contacts/${id}`)
  return { success: true }
}

export async function archiveContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const id = formData.get('id') as string

  try {
    await prisma.contact.update({
      where: { id },
      data: {
        archivedAt: new Date()
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'ARCHIVE',
        entityType: 'Contact',
        entityId: id,
        userId: session.userId,
      }
    })
  } catch (error) {
    return { error: 'Erreur lors de l\'archivage.' }
  }

  redirect('/contacts')
}
