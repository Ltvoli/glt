'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { mailCaseSchema } from '@/lib/validations'
import { requirePermission } from '@/lib/permissions'
import { promises as fs } from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabase'
import { analyzeIncomingMail, generateReplies } from '@/lib/gemini'

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
    requirePermission(session.role, 'MANAGE_MAILS')
  } catch (e: any) {
    return { error: e.message }
  }

  const subject = (formData.get('subject') as string) || undefined
  const senderName = formData.get('senderName') as string
  const recipientName = formData.get('recipientName') as string
  const city = formData.get('city') as string
  const channel = (formData.get('channel') as string) || undefined
  const category = formData.get('category') as string
  const urgency = (formData.get('urgency') as string) || undefined
  const notes = formData.get('notes') as string
  const content = formData.get('content') as string
  const receiveDateStr = formData.get('receiveDate') as string
  const sentDateStr = formData.get('sentDate') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string
  const type = formData.get('type') as string || 'ENTRANT'
  const parentMailCaseId = formData.get('parentMailCaseId') as string
  const validationStatus = formData.get('validationStatus') as string

  const validatedFields = mailCaseSchema.safeParse({
    subject, senderName, recipientName, city, channel, category, urgency, notes, content, assigneeId, type, validationStatus
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
        validationStatus: (validData.validationStatus && validData.validationStatus !== '') 
          ? validData.validationStatus 
          : (validData.type === 'SORTANT' ? 'BROUILLON' : null),
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

export async function updateMail(mailId: string, prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_MAILS')
  } catch (e: any) {
    return { error: e.message }
  }

  const subject = (formData.get('subject') as string) || undefined
  const senderName = formData.get('senderName') as string
  const recipientName = formData.get('recipientName') as string
  const city = formData.get('city') as string
  const channel = (formData.get('channel') as string) || undefined
  const category = formData.get('category') as string
  const urgency = (formData.get('urgency') as string) || undefined
  const notes = formData.get('notes') as string
  const content = formData.get('content') as string
  const receiveDateStr = formData.get('receiveDate') as string
  const sentDateStr = formData.get('sentDate') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string
  const type = formData.get('type') as string || 'ENTRANT'
  const parentMailCaseId = formData.get('parentMailCaseId') as string
  const validationStatus = formData.get('validationStatus') as string

  const validatedFields = mailCaseSchema.safeParse({
    subject, senderName, recipientName, city, channel, category, urgency, notes, content, assigneeId, type, validationStatus
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
    const existing = await prisma.mailCase.findUnique({ where: { id: mailId } })
    if (!existing) return { error: 'Courrier introuvable.' }

    // Enregistrer une nouvelle version si le sujet ou le contenu a changé
    if (existing.subject !== validData.subject || existing.content !== validData.content) {
      await prisma.mailVersion.create({
        data: {
          mailCaseId: mailId,
          subject: existing.subject,
          content: existing.content,
          editedById: session.userId
        }
      })
    }

    let finalValidationStatus = validData.validationStatus !== undefined ? validData.validationStatus : undefined
    if (existing.validationStatus === 'REJETE' && finalValidationStatus === undefined) {
      // Repasse en brouillon si on modifie un courrier qui était rejeté
      finalValidationStatus = 'BROUILLON'
    }

    await prisma.mailCase.update({
      where: { id: mailId },
      data: {
        type: validData.type,
        subject: validData.subject,
        senderName: validData.senderName || null,
        recipientName: validData.recipientName || null,
        city: validData.city || null,
        channel: validData.channel,
        category: validData.category || null,
        urgency: validData.urgency || 'NORMALE',
        validationStatus: finalValidationStatus,
        rejectionReason: (finalValidationStatus === 'BROUILLON' || finalValidationStatus === 'A_VALIDER' || finalValidationStatus === 'VALIDE') ? null : undefined,
        receiveDate,
        sentDate,
        content: validData.content || null,
        notes: validData.notes || null,
        assigneeId: validData.assigneeId || null,
        parentMailCaseId: parentMailCaseId || null,
        responseDueDate
      }
    })

    // Sync contact link
    await prisma.globalLink.deleteMany({
      where: { mailCaseId: mailId, contactId: { not: null } }
    })
    if (contactId) {
      await prisma.globalLink.create({
        data: { mailCaseId: mailId, contactId }
      })
    }

    // Sync task link
    await prisma.globalLink.deleteMany({
      where: { mailCaseId: mailId, taskId: { not: null } }
    })
    if (taskId) {
      await prisma.globalLink.create({
        data: { mailCaseId: mailId, taskId }
      })
    }

    await logAudit('update', 'MailCase', mailId, session.userId, validData)

  } catch (error) {
    console.error(error)
    return { error: 'Erreur lors de la mise à jour du courrier.' }
  }

  revalidatePath(`/mails/${mailId}`)
  revalidatePath('/mails')
  redirect(`/mails/${mailId}`)
}


export async function updateMailStatus(mailId: string, status: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

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
  requirePermission(session.role, 'MANAGE_MAILS')

  await prisma.mailCase.updateMany({
    where: { id: { in: mailIds } },
    data: { status }
  })

  // Audit logs for each and revalidate path
  for (const id of mailIds) {
    await logAudit('UPDATE_STATUS', 'MailCase', id, session.userId, { action: 'BATCH_UPDATE', newStatus: status })
    revalidatePath(`/mails/${id}`)
  }

  revalidatePath('/mails')
}

export async function validateMail(mailId: string) {
  const session = await requireWriteAccess()
  if (session.dbRole !== 'ADMINISTRATEUR') {
    return { error: 'Non autorisé. Seul un administrateur peut valider ce courrier.' }
  }

  const updatedMail = await prisma.mailCase.update({
    where: { id: mailId },
    data: { 
      validationStatus: 'VALIDE',
      rejectionReason: null
    }
  })

  // Notify assignee
  if (updatedMail.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: updatedMail.assigneeId,
        type: 'STATUS_CHANGE',
        title: 'Courrier validé par le député',
        message: `Le courrier "${updatedMail.subject}" (${updatedMail.reference}) a été validé !`,
        relatedType: 'MailCase',
        relatedId: mailId,
        severity: 'INFO'
      }
    })
  }

  revalidatePath('/mails')
  revalidatePath('/mails/' + mailId)
  return { success: true }
}

export async function rejectMail(mailId: string, reason?: string) {
  const session = await requireWriteAccess()
  if (session.dbRole !== 'ADMINISTRATEUR') {
    return { error: 'Non autorisé. Seul un administrateur peut rejeter ce courrier.' }
  }

  const updatedMail = await prisma.mailCase.update({
    where: { id: mailId },
    data: { 
      validationStatus: 'REJETE',
      rejectionReason: reason || null
    }
  })

  // Notify assignee
  if (updatedMail.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: updatedMail.assigneeId,
        type: 'STATUS_CHANGE',
        title: 'Courrier à corriger (rejeté)',
        message: `Le courrier "${updatedMail.subject}" (${updatedMail.reference}) a été rejeté par le député.${reason ? ` Motif : ${reason}` : ''}`,
        relatedType: 'MailCase',
        relatedId: mailId,
        severity: 'WARNING'
      }
    })
  }

  revalidatePath('/mails')
  revalidatePath('/mails/' + mailId)
  return { success: true }
}

export async function submitMailForValidation(mailId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const mail = await prisma.mailCase.findUnique({ where: { id: mailId } })
  if (!mail) return { error: 'Courrier introuvable' }

  await prisma.mailCase.update({
    where: { id: mailId },
    data: { validationStatus: 'A_VALIDER' }
  })

  // Notify all Admins and Supervisors
  const supervisorsAndAdmins = await prisma.user.findMany({
    where: { 
      role: { in: ['ADMINISTRATEUR', 'SUPERVISEUR'] },
      isActive: true
    }
  })

  for (const user of supervisorsAndAdmins) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'STATUS_CHANGE',
        title: 'Courrier à valider',
        message: `Le courrier "${mail.subject}" (${mail.reference}) a été soumis pour validation.`,
        relatedType: 'MailCase',
        relatedId: mail.id,
        severity: 'INFO'
      }
    })
  }

  revalidatePath('/mails')
  revalidatePath('/mails/' + mailId)
  return { success: true }
}

export async function addMailComment(mailId: string, content: string) {
  if (!content || !content.trim()) return { error: 'Le commentaire ne peut pas être vide' }

  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const comment = await prisma.mailComment.create({
    data: {
      mailCaseId: mailId,
      authorId: session.userId,
      content: content.trim()
    },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  revalidatePath('/mails/' + mailId)
  return { success: true, comment }
}

async function getDocumentBuffer(doc: any): Promise<Buffer> {
  let filePath = doc.storagePath
  if (filePath.startsWith('/uploads/')) {
    filePath = path.join(process.cwd(), 'public', filePath)
  }

  const isSupabasePath = !filePath.startsWith('/') && !filePath.includes(':\\')

  if (isSupabasePath) {
    const { data, error } = await supabase
      .storage
      .from('crm-attachments')
      .download(filePath)

    if (error) {
      throw new Error(`Supabase download error: ${error.message}`)
    }
    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } else {
    return await fs.readFile(filePath)
  }
}

export async function analyzeMailCaseAction(mailCaseId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const mailEnabledSetting = await prisma.setting.findUnique({ where: { key: 'ai.mail_enabled' } })
  if (mailEnabledSetting?.value !== 'true') {
    return { error: 'L\'assistant IA est désactivé globalement.' }
  }

  const mail = await prisma.mailCase.findUnique({
    where: { id: mailCaseId },
    include: { documents: true }
  })
  if (!mail) return { error: 'Courrier introuvable.' }

  try {
    let contentForAi = mail.content || ""
    let mimeType = "text/plain"

    const doc = mail.documents[0]
    if (doc) {
      const buffer = await getDocumentBuffer(doc)
      contentForAi = buffer.toString('base64')
      mimeType = doc.mimeType
    }

    if (!contentForAi) {
      return { error: "Le courrier n'a pas de contenu textuel ni de document joint." }
    }

    const aiResult = await analyzeIncomingMail(contentForAi, mimeType)

    // Save back to MailCase
    await prisma.mailCase.update({
      where: { id: mailCaseId },
      data: {
        aiAnalysis: aiResult,
        aiSuggestions: aiResult.pistes_reponse || []
      }
    })

    revalidatePath(`/mails/${mailCaseId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[analyzeMailCaseAction] error:', err)
    return { error: `Erreur lors de l'analyse IA : ${err.message || err}` }
  }
}

export async function generateMailResponsesAction(
  mailCaseId: string,
  selectedSuggestionIds: number[],
  customInstruction?: string
) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const mail = await prisma.mailCase.findUnique({
    where: { id: mailCaseId }
  })
  if (!mail) return { error: 'Courrier introuvable.' }

  const suggestions = (mail.aiSuggestions as any[]) || []
  const selectedSuggestions = suggestions.filter((s: any) => selectedSuggestionIds.includes(s.id))

  if (selectedSuggestions.length === 0) {
    return { error: 'Aucune piste de réponse sélectionnée.' }
  }

  try {
    const responseDrafts = await generateReplies(
      mail.content || mail.subject,
      mail.aiAnalysis,
      selectedSuggestions,
      customInstruction
    )

    const generatedMails = []

    for (const draft of responseDrafts.courriers || []) {
      const reference = await generateReference()
      // Create child MailCase record
      const childMail = await prisma.mailCase.create({
        data: {
          reference,
          type: 'SORTANT',
          status: 'BROUILLON',
          validationStatus: 'BROUILLON',
          subject: draft.objet || `Réponse - ${mail.subject}`,
          recipientName: draft.destinataire_nom || mail.senderName || '',
          content: `${draft.corps}\n\n${draft.formule_politesse}`,
          parentMailCaseId: mailCaseId,
          channel: 'MAIL',
          notes: draft.champs_a_completer?.length > 0 
            ? `Champs à compléter générés par l'IA :\n${draft.champs_a_completer.map((c: string) => `- ${c}`).join('\n')}` 
            : null
        }
      })

      await logAudit('CONTACT_CREATED', 'MailCase', childMail.id, session.userId, childMail)
      generatedMails.push(childMail)
    }

    revalidatePath(`/mails/${mailCaseId}`)
    return { success: true, count: generatedMails.length }
  } catch (err: any) {
    console.error('[generateMailResponsesAction] error:', err)
    return { error: `Erreur lors de la génération des réponses : ${err.message || err}` }
  }
}

export async function toggleAiAssistantAction(mailCaseId: string, hide: boolean) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  try {
    await prisma.mailCase.update({
      where: { id: mailCaseId },
      data: { hideAiAssistant: hide }
    })

    revalidatePath(`/mails/${mailCaseId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[toggleAiAssistantAction] error:', err)
    return { error: `Erreur de modification : ${err.message || err}` }
  }
}

