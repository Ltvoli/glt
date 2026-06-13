'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { qeSchema } from '@/lib/validations'

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
  
  const validatedFields = qeSchema.safeParse({
    title, type, ministry, theme, anNumber, text: content, notes
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const validData = validatedFields.data

  try {
    const newQE = await prisma.writtenQuestion.create({
      data: {
        title: validData.title,
        type: validData.type,
        ministry: validData.ministry || null,
        theme: validData.theme || null,
        anNumber: validData.anNumber || null,
        content: validData.text || null,
        notes: validData.notes || null,
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

      const storageName = uuidv4()
      const extension = path.extname(attachmentFile.name) || ('.' + attachmentFile.name.split('.').pop())
      const fileName = `${storageName}${extension}`

      // Upload vers Supabase
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-attachments')
        .upload(fileName, buffer, {
          contentType: attachmentFile.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Erreur Supabase upload QE:', uploadError)
        // On continue la création de la QE même si l'upload échoue, 
        // ou on pourrait retourner une erreur.
      } else {
        await prisma.document.create({
          data: {
            originalName: attachmentFile.name,
            storageName: fileName,
            storagePath: uploadData.path,
            mimeType: attachmentFile.type,
            extension,
            size: attachmentFile.size,
            documentType: 'QE',
            confidentiality: 'INTERNE',
            questionId: newQE.id,
            uploadedById: session.userId,
            title: attachmentFile.name
          }
        })
      }
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

  await logAudit('UPDATE_STATUS', 'WrittenQuestion', qeId, session.userId, { before: qe.status, after: status })

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
  await logAudit('UPDATE', 'WrittenQuestion', qeId, session.userId, { action: "Ajout réponse ministérielle", status: 'REPONSE_RECUE' })

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
    const updatedQE = await prisma.writtenQuestion.update({
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

  await logAudit(
    isArchived ? 'RESTORE' : 'ARCHIVE',
    'WrittenQuestion',
    qeId,
    session.userId
  )

  revalidatePath(`/qe/${qeId}`)
  revalidatePath('/qe')
}

export async function relaunchQe(qeId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_QE')

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })
  if (!qe) throw new Error('QE introuvable')

  // Create a task for the reminder
  await prisma.task.create({
    data: {
      title: `Relance QE: ${qe.title}`,
      description: `La question écrite ${qe.anNumber || ''} a dépassé les 60 jours sans réponse. Merci de relancer le ministère (${qe.ministry}).`,
      priority: 'HAUTE',
      status: 'A_FAIRE',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      assigneeId: session.userId, // Assign to the person triggering the relaunch
    }
  })

  // Update QE status
  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: {
      reminderStatus: 'A_RELANCER',
      followUpAction: 'RELANCE'
    }
  })

  revalidatePath('/qe')
}

export async function redepositQe(qeId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_QE')

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })
  if (!qe) throw new Error('QE introuvable')

  // Create duplicate
  const newQe = await prisma.writtenQuestion.create({
    data: {
      title: `${qe.title} (Redépôt)`,
      type: qe.type,
      ministry: qe.ministry,
      theme: qe.theme,
      content: qe.content,
      status: 'BROUILLON',
      linkedOriginalQeId: qe.id,
      notes: "Redépôt suite absence de réponse après 60 jours",
      createdById: session.userId,
    }
  })

  // Update original
  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: {
      status: 'RETOUR_EFFECTUE',
      redepositSuggested: true,
      redepositDate: new Date(),
      followUpAction: 'REDEPOT',
      followUpNotes: `Redéposée sous le nouveau brouillon (ID: ${newQe.id})`
    }
  })

  revalidatePath('/qe')
}

export async function batchUpdateQeStatus(qeIds: string[], status: string) {
  const session = await requireWriteAccess()

  const dataToUpdate: any = { status }
  if (status === 'DEPOSEE') {
    dataToUpdate.depositDate = new Date()
  } else if (status === 'REPONSE_RECUE') {
    dataToUpdate.responseDate = new Date()
  }

  await prisma.writtenQuestion.updateMany({
    where: { id: { in: qeIds } },
    data: dataToUpdate
  })

  for (const id of qeIds) {
    await logAudit('UPDATE_STATUS', 'WrittenQuestion', id, session.userId, { action: 'BATCH_UPDATE', newStatus: status })
  }

  revalidatePath('/qe')
}
