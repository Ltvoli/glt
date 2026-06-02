'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function createContact(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

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

  if (!firstName || !lastName || !type) {
    return { error: 'Nom, prénom et type sont obligatoires.' }
  }

  let birthDate = null
  if (birthDateStr) {
    birthDate = new Date(birthDateStr)
  }

  try {
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
        createdById: session.userId,
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Contact',
        entityId: newContact.id,
        userId: session.userId,
        newValues: JSON.stringify(newContact)
      }
    })

  } catch (error) {
    return { error: 'Erreur lors de la création du contact.' }
  }

  redirect('/contacts')
}
