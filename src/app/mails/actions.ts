'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

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
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const subject = formData.get('subject') as string
  const senderName = formData.get('senderName') as string
  const city = formData.get('city') as string
  const channel = formData.get('channel') as string
  const category = formData.get('category') as string
  const urgency = formData.get('urgency') as string
  const notes = formData.get('notes') as string
  const content = formData.get('content') as string
  const receiveDateStr = formData.get('receiveDate') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string
  const type = formData.get('type') as string || 'ENTRANT'
  const parentMailCaseId = formData.get('parentMailCaseId') as string

  if (!subject || !channel || !receiveDateStr) {
    return { error: 'Le sujet, le canal et la date sont obligatoires.' }
  }

  let receiveDate = new Date(receiveDateStr)
  let responseDueDate = null
  
  if (type === 'ENTRANT') {
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
        type,
        subject,
        senderName: senderName || null,
        city: city || null,
        channel,
        category: category || null,
        urgency: urgency || 'NORMALE',
        receiveDate,
        content: content || null,
        notes: notes || null,
        assigneeId: assigneeId || null,
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

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'MailCase',
        entityId: newMail.id,
        userId: session.userId,
        newValues: JSON.stringify(newMail)
      }
    })
    // Handle optional attachment upload
    const attachmentFile = formData.get('attachment') as File | null
    if (attachmentFile && attachmentFile.size > 0) {
      const bytes = await attachmentFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uploadDir = join(process.cwd(), 'uploads')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const filepath = join(uploadDir, uniqueSuffix + '-' + attachmentFile.name)

      await writeFile(filepath, buffer)

      await prisma.attachment.create({
        data: {
          filename: attachmentFile.name,
          filepath: filepath,
          mimeType: attachmentFile.type,
          size: attachmentFile.size,
          mailCaseId: newMail.id,
          uploadedById: session.userId
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
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  const mail = await prisma.mailCase.findUnique({ where: { id: mailId } })
  if (!mail) throw new Error('Courrier introuvable')

  const updated = await prisma.mailCase.update({
    where: { id: mailId },
    data: { status }
  })

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_STATUS',
      entityType: 'MailCase',
      entityId: mailId,
      userId: session.userId,
      oldValues: JSON.stringify({ status: mail.status }),
      newValues: JSON.stringify({ status })
    }
  })

  revalidatePath(`/mails/${mailId}`)
  revalidatePath('/mails')
}
