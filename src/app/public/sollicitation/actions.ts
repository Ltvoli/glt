'use server'

import prisma from '@/lib/prisma'
import { syncContactToBrevo } from '@/lib/brevo'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = any> = {
  success: boolean
  error?: string
  data?: T
}

export async function submitPublicSollicitation(formData: FormData): Promise<ActionResult> {
  try {
    const civility = formData.get('civility') as string // H, F, Autre
    const firstName = (formData.get('firstName') as string || '').trim()
    const lastName = (formData.get('lastName') as string || '').trim()
    const email = (formData.get('email') as string || '').trim().toLowerCase()
    const mobilePhone = (formData.get('mobilePhone') as string || '').trim()
    const streetNumber = (formData.get('streetNumber') as string || '').trim()
    const streetName = (formData.get('streetName') as string || '').trim()
    const postalCode = (formData.get('postalCode') as string || '').trim()
    const city = (formData.get('city') as string || '').trim()
    const type = formData.get('type') as string // SOLLICITATION or NEWSLETTER
    const subject = (formData.get('subject') as string || '').trim()
    const message = (formData.get('message') as string || '').trim()

    if (!firstName || !lastName) {
      return { success: false, error: 'Le prénom et le nom sont obligatoires.' }
    }

    if (!email && !mobilePhone) {
      return { success: false, error: 'Une adresse e-mail ou un numéro de portable est obligatoire.' }
    }

    // Find the first Administrator to assign as the creator (system contact)
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMINISTRATEUR' }
    })
    const anyUser = await prisma.user.findFirst()
    const createdById = admin?.id || anyUser?.id

    if (!createdById) {
      return { success: false, error: 'Erreur système : aucun administrateur configuré.' }
    }

    // Find if contact already exists by email or mobile phone
    let contact = null
    if (email) {
      contact = await prisma.contact.findFirst({
        where: { email, archivedAt: null }
      })
    }
    if (!contact && mobilePhone) {
      contact = await prisma.contact.findFirst({
        where: { mobilePhone, archivedAt: null }
      })
    }

    if (contact) {
      // Update existing contact
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          firstName,
          lastName,
          gender: civility || contact.gender,
          streetNumber: streetNumber || contact.streetNumber,
          streetName: streetName || contact.streetName,
          postalCode: postalCode || contact.postalCode,
          city: city || contact.city,
          consentEmail: type === 'NEWSLETTER' ? true : contact.consentEmail,
          consentDate: new Date(),
          consentSource: 'Formulaire Public'
        }
      })
    } else {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          gender: civility || null,
          email: email || null,
          mobilePhone: mobilePhone || null,
          streetNumber: streetNumber || null,
          streetName: streetName || null,
          postalCode: postalCode || null,
          city: city || null,
          type: 'ELECTEUR',
          consentEmail: type === 'NEWSLETTER',
          consentSms: type === 'SOLLICITATION',
          consentDate: new Date(),
          consentSource: 'Formulaire Public',
          createdById
        }
      })

      // Try to associate with the 'Formulaire Public' tag
      let tag = await prisma.tag.findFirst({
        where: { name: 'Formulaire Public' }
      })
      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: 'Formulaire Public', color: '#10b981' }
        })
      }

      await prisma.contactTag.create({
        data: {
          contactId: contact.id,
          tagId: tag.id
        }
      })
    }

    // Log public interaction
    await prisma.contactInteraction.create({
      data: {
        contactId: contact.id,
        type: 'RENCONTRE_PHYSIQUE',
        notes: `Soumission du formulaire public de contact. Type: ${type}. Objet: ${subject || 'Non spécifié'}`,
        createdById
      }
    })

    if (type === 'NEWSLETTER') {
      // Sync to Brevo
      if (email) {
        await syncContactToBrevo(contact.id)
      }
    } else {
      // Create Task for sollicitation
      const task = await prisma.task.create({
        data: {
          title: `Nouvelle sollicitation : ${subject || 'Demande citoyenne'}`,
          description: `Demande de ${firstName} ${lastName} (${email || 'Pas d\'email'}, ${mobilePhone || 'Pas de mobile'}) :\n\n${message || 'Aucun message fourni.'}`,
          priority: 'HAUTE',
          status: 'A_FAIRE',
          assigneeId: createdById
        }
      })

      // Link task and contact
      await prisma.globalLink.create({
        data: {
          contactId: contact.id,
          taskId: task.id
        }
      })
    }

    revalidatePath('/contacts')
    revalidatePath('/tasks')
    return { success: true }
  } catch (error: any) {
    console.error('Error public form action:', error)
    return { success: false, error: error.message || 'Une erreur est survenue lors de la soumission.' }
  }
}
