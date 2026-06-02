'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logAudit } from '@/lib/audit'

export async function createQE(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const ministry = formData.get('ministry') as string
  const theme = formData.get('theme') as string
  const anNumber = formData.get('anNumber') as string
  const content = formData.get('content') as string
  const notes = formData.get('notes') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string
  const mailId = formData.get('mailId') as string

  const followUpDescription = formData.get('followUpDescription') as string
  const followUpDueDateStr = formData.get('followUpDueDate') as string
  
  if (!title || !type) {
    return { error: 'Le titre et le type sont obligatoires.' }
  }

  try {
    const newQE = await prisma.writtenQuestion.create({
      data: {
        title,
        type,
        ministry: ministry || null,
        theme: theme || null,
        anNumber: anNumber || null,
        content: content || null,
        notes: notes || null,
        assigneeId: assigneeId || null,
        createdById: session.userId,
        status: 'EN_ATTENTE', // Une QE déposée passe par défaut en "en attente de réponse"
        depositDate: new Date(),
        followUpDescription: followUpDescription || null,
        followUpDueDate: followUpDueDateStr ? new Date(followUpDueDateStr) : null,
      }
    })

    // Links
    if (contactId) {
      await prisma.globalLink.create({
        data: { questionId: newQE.id, contactId }
      })
    }

    if (taskId) {
      await prisma.globalLink.create({
        data: { questionId: newQE.id, taskId }
      })
    }

    if (mailId) {
      await prisma.globalLink.create({
        data: { questionId: newQE.id, mailCaseId: mailId }
      })
    }

    // Audit
    await logAudit('CREATE', 'WrittenQuestion', newQE.id, session.userId, newQE)

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
          questionId: newQE.id,
          uploadedById: session.userId
        }
      })
    }

  } catch (error) {
    console.error(error)
    return { error: 'Erreur lors de la création de la question.' }
  }

  redirect('/qe')
}

export async function updateQEStatus(qeId: string, status: string) {
  const session = await requireWriteAccess()

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })
  if (!qe) throw new Error('Question introuvable')

  // Automatically update dates based on status if needed
  const dataToUpdate: any = { status }
  if (status === 'DEPOSEE' && !qe.depositDate) {
    dataToUpdate.depositDate = new Date()
  } else if (status === 'REPONSE_RECUE' && !qe.responseDate) {
    dataToUpdate.responseDate = new Date()
  }

  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: dataToUpdate
  })

  await logAudit('UPDATE_STATUS', 'WrittenQuestion', qeId, session.userId, { status }, { status: qe.status })

  revalidatePath(`/qe/${qeId}`)
  revalidatePath('/qe')
}

export async function updateQEResponse(qeId: string, responseContent: string) {
  const session = await requireWriteAccess()

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })

  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: { responseContent, status: 'REPONSE_RECUE', responseDate: new Date() }
  })

  // Create notification if assigned
  if (qe?.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: qe.assigneeId,
        type: 'STATUS_CHANGE',
        title: 'Réponse reçue (QE)',
        message: `Une réponse a été reçue pour la question : ${qe.title}`,
        relatedType: 'WrittenQuestion',
        relatedId: qe.id,
        severity: 'INFO'
      }
    })
  }

  // Log audit
  await logAudit('UPDATE', 'WrittenQuestion', qeId, session.userId, undefined, { action: "Ajout réponse ministérielle", status: 'REPONSE_RECUE' })

  revalidatePath(`/qe/${qeId}`)
}

export async function updateQE(qeId: string, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const ministry = formData.get('ministry') as string
  const theme = formData.get('theme') as string
  const anNumber = formData.get('anNumber') as string
  const content = formData.get('content') as string
  const notes = formData.get('notes') as string
  const assigneeId = formData.get('assigneeId') as string
  
  const followUpDescription = formData.get('followUpDescription') as string
  const followUpDueDateStr = formData.get('followUpDueDate') as string

  if (!title || !type) {
    return { error: 'Le titre et le type sont obligatoires.' }
  }

  try {
    await prisma.writtenQuestion.update({
      where: { id: qeId },
      data: {
        title,
        type,
        ministry: ministry || null,
        theme: theme || null,
        anNumber: anNumber || null,
        content: content || null,
        notes: notes || null,
        assigneeId: assigneeId || null,
        followUpDescription: followUpDescription || null,
        followUpDueDate: followUpDueDateStr ? new Date(followUpDueDateStr) : null,
      }
    })

    await logAudit('UPDATE', 'WrittenQuestion', qeId, session.userId, updatedQE)
  } catch (error) {
    console.error(error)
    return { error: 'Erreur lors de la modification de la question.' }
  }

  redirect(`/qe/${qeId}`)
}

export async function archiveQE(qeId: string) {
  const session = await requireWriteAccess()

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })
  if (!qe) throw new Error('Question introuvable')

  const isArchived = !!qe.archivedAt
  
  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: { archivedAt: isArchived ? null : new Date() }
  })

  await prisma.auditLog.create({
    data: {
      action: isArchived ? 'RESTORE' : 'ARCHIVE',
      entityType: 'WrittenQuestion',
      entityId: qeId,
      userId: session.userId,
    }
  })

  revalidatePath(`/qe/${qeId}`)
  revalidatePath('/qe')
}
