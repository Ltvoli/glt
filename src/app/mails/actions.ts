'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { mailCaseSchema } from '@/lib/validations'

// Utility to generate unique reference e.g., COU-2026-0042
async function generateReference() {
  const year = new Date().getFullYear()
  
  const lastMail = await prisma.mailCase.findFirst({
    where: { reference: { startsWith: `COU-${year}-` } },
    orderBy: { createdAt: 'desc' }
  })

  let nextNumber = 1
  if (lastMail) {
    const parts = lastMail.reference.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  return `COU-${year}-${nextNumber.toString().padStart(4, '0')}`
}

export async function createMail(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  const subject = formData.get('subject') as string
  const senderName = formData.get('senderName') as string
  const recipientName = formData.get('recipientName') as string
  const city = formData.get('city') as string
  const channel = formData.get('channel') as string
  const category = formData.get('category') as string
  const urgency = formData.get('urgency') as string
  const notes = formData.get('notes') as string
  const content = formData.get('content') as string
  const receiveDateStr = formData.get('receiveDate') as string
  const sentDateStr = formData.get('sentDate') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string
  const type = formData.get('type') as string || 'ENTRANT'
  const parentMailCaseId = formData.get('parentMailCaseId') as string

  const validatedFields = mailCaseSchema.safeParse({
    subject, senderName, recipientName, city, channel, category, urgency, notes, content, assigneeId, type
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const validData = validatedFields.data

  const receiveDate = receiveDateStr ? new Date(receiveDateStr) : null
  const sentDate = sentDateStr ? new Date(sentDateStr) : null
  
  if (type === 'ENTRANT' && !receiveDate) {
    return { error: 'La date de réception est obligatoire pour un courrier entrant.' }
  }
  if (type === 'SORTANT' && !sentDate) {
    return { error: 'La date d\'envoi est obligatoire pour un courrier sortant.' }
  }

  let responseDueDate = null
  
  if (type === 'ENTRANT' && receiveDate) {
    responseDueDate = new Date(receiveDate)
    let addedDays = 0
    while (addedDays < 5) {
      responseDueDate.setDate(responseDueDate.getDate() + 1)
      const day = responseDueDate.getDay()
      if (day !== 0 && day !== 6) { // Skip Sunday(0) and Saturday(6)
        addedDays++
      }
    }
  }

  try {
    const reference = await generateReference()

    const newMail = await prisma.mailCase.create({
      data: {
        reference,
        type: validData.type,
        subject: validData.subject,
        senderName: validData.senderName || null,
        recipientName: validData.recipientName || null,
        city: validData.city || null,
        channel: validData.channel,
        category: validData.category || null,
        urgency: validData.urgency || 'NORMALE',
        receiveDate,
        sentDate,
        content: validData.content || null,
        notes: validData.notes || null,
        assigneeId: validData.assigneeId || null,
        parentMailCaseId: parentMailCaseId || null,
        responseDueDate
      }
    })

    // Link to Contact if provided
    if (contactId) {
      await prisma.globalLink.create({
        data: {
          mailCaseId: newMail.id,
          contactId,
        }
      })
    }

    // Link to Task if provided
    if (taskId) {
      await prisma.globalLink.create({
        data: {
          mailCaseId: newMail.id,
          taskId,
        }
      })
    }

    await logAudit('CREATE', 'MailCase', newMail.id, session.userId, newMail)
    // Handle optional attachment upload
    const attachmentFile = formData.get('attachment') as File | null
    if (attachmentFile && attachmentFile.size > 0) {
      const bytes = await attachmentFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + attachmentFile.name

      // Upload vers Supabase Storage
      const { supabase } = await import('@/lib/supabase')
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-attachments')
        .upload(uniqueFilename, buffer, {
          contentType: attachmentFile.type,
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erreur Supabase: ${uploadError.message}`)
      }

      const extension = '.' + attachmentFile.name.split('.').pop()
      await prisma.document.create({
        data: {
          originalName: attachmentFile.name,
          storageName: uniqueFilename,
          storagePath: uploadData.path,
          mimeType: attachmentFile.type,
          extension,
          size: attachmentFile.size,
          documentType: 'COURRIER',
          confidentiality: 'INTERNE',
          mailCaseId: newMail.id,
          uploadedById: session.userId,
          title: attachmentFile.name
        }
      })
    }

  } catch (error) {
    console.error(error)
    return { error: 'Erreur lors de la création du courrier.' }
  }

  redirect('/mails')
}

export async function updateMailStatus(mailId: string, status: string) {
  const session = await requireWriteAccess()

  const mail = await prisma.mailCase.findUnique({ where: { id: mailId } })
  if (!mail) throw new Error('Courrier introuvable')

  const updated = await prisma.mailCase.update({
    where: { id: mailId },
    data: { status }
  })

  await logAudit('UPDATE_STATUS', 'MailCase', mailId, session.userId, { before: mail.status, after: status })

  revalidatePath(`/mails/${mailId}`)
  revalidatePath('/mails')
}

export async function batchUpdateMailStatus(mailIds: string[], status: string) {
  const session = await requireWriteAccess()

  await prisma.mailCase.updateMany({
    where: { id: { in: mailIds } },
    data: { status }
  })

  // Audit logs for each
  for (const id of mailIds) {
    await logAudit('UPDATE_STATUS', 'MailCase', id, session.userId, { action: 'BATCH_UPDATE', newStatus: status })
  }

  revalidatePath('/mails')
}
