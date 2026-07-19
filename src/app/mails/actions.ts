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
import { addBusinessDays, isWorkflowTaskTitle, parseFullName } from '@/lib/mail-utils'
import { handleCommentMentions } from '@/app/tasks/[id]/actions'

// Utility to generate unique reference e.g., COU-2026-0042
export async function generateReference() {
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

  const responseDueDate = (type === 'ENTRANT' && receiveDate) ? addBusinessDays(receiveDate, 5) : null

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

      const { v4: uuidv4 } = await import('uuid')
      const extension = '.' + attachmentFile.name.split('.').pop()
      const storageName = `${uuidv4()}${extension}`

      // Upload vers Supabase Storage
      const { supabase } = await import('@/lib/supabase')
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-attachments')
        .upload(storageName, buffer, {
          contentType: attachmentFile.type,
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erreur Supabase: ${uploadError.message}`)
      }

      await prisma.document.create({
        data: {
          originalName: attachmentFile.name,
          storageName: storageName,
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

    // Trigger auto-analysis if enabled and type is ENTRANT
    const autoAnalyzeSetting = await prisma.setting.findUnique({ where: { key: 'ai.auto_analyze_on_import' } })
    if (autoAnalyzeSetting?.value === 'true' && validData.type === 'ENTRANT') {
      try {
        await analyzeMailCaseAction(newMail.id)
      } catch (ae: any) {
        console.error('[createMail] auto-analysis error:', ae)
        // Do not block mail creation if auto-analysis fails
      }
    }

    // Trigger workflows
    await triggerMailCaseWorkflows(newMail.id, session.userId)

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

  const responseDueDate = (type === 'ENTRANT' && receiveDate) ? addBusinessDays(receiveDate, 5) : null

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

    // Sync task link (ignoring workflow tasks to avoid deleting them)
    const existingLinks = await prisma.globalLink.findMany({
      where: { mailCaseId: mailId, taskId: { not: null } },
      include: { task: true }
    })

    const manualLinks = existingLinks.filter(l => l.task && !isWorkflowTaskTitle(l.task.title, existing.reference))

    if (manualLinks.length > 0) {
      await prisma.globalLink.deleteMany({
        where: {
          id: { in: manualLinks.map(l => l.id) }
        }
      })
    }

    if (taskId) {
      const alreadyLinked = existingLinks.some(l => l.taskId === taskId)
      if (!alreadyLinked) {
        await prisma.globalLink.create({
          data: { mailCaseId: mailId, taskId }
        })
      }
    }

    await logAudit('update', 'MailCase', mailId, session.userId, validData)

    // Trigger workflows
    await triggerMailCaseWorkflows(mailId, session.userId)

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

export async function submitMailForValidation(mailId: string, validatorUserId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const mail = await prisma.mailCase.findUnique({ where: { id: mailId } })
  if (!mail) return { error: 'Courrier introuvable' }

  await prisma.mailCase.update({
    where: { id: mailId },
    data: { validationStatus: 'A_VALIDER' }
  })

  // Create automatic task assigned to the selected validator
  const newTask = await prisma.task.create({
    data: {
      title: `Valider le courrier : ${mail.subject} (${mail.reference})`,
      description: `Valider le courrier de réponse rédigé par l'équipe.`,
      status: 'A_FAIRE',
      priority: 'NORMALE',
      assigneeId: validatorUserId
    }
  })

  // Link task to the mail case
  await prisma.globalLink.create({
    data: {
      taskId: newTask.id,
      mailCaseId: mail.id
    }
  })

  // Notify the selected validator
  await prisma.notification.create({
    data: {
      userId: validatorUserId,
      type: 'STATUS_CHANGE',
      title: 'Courrier à valider',
      message: `Le courrier "${mail.subject}" (${mail.reference}) vous a été soumis pour validation.`,
      relatedType: 'MailCase',
      relatedId: mail.id,
      severity: 'INFO'
    }
  })

  // Envoyer un e-mail automatique d'alerte au validateur via Brevo
  const validator = await prisma.user.findUnique({
    where: { id: validatorUserId }
  })
  if (validator?.email) {
    const { sendBrevoEmail } = await import('@/lib/brevo')
    const emailSubject = `📥 Courrier à valider : ${mail.subject}`
    const hostUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">Nouveau courrier en attente de validation</h2>
        <p>Bonjour <strong>${validator.firstName}</strong>,</p>
        <p>Un projet de courrier de réponse pour <strong>"${mail.subject}"</strong> (Réf: ${mail.reference}) a été soumis pour validation et vous a été attribué.</p>
        <p>Vous pouvez accéder directement à la fiche du courrier pour le relire, comparer les versions et le valider :</p>
        <div style="margin: 20px 0; text-align: center;">
          <a href="${hostUrl}/mails/${mail.id}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Voir le courrier</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.85em; color: #64748b; margin-bottom: 0;">Secrétariat du Député Lionel TIVOLI</p>
      </div>
    `
    try {
      await sendBrevoEmail(validator.email, `${validator.firstName} ${validator.lastName}`, emailSubject, emailHtml)
    } catch (err) {
      console.error("[VALIDATION] Échec de l'envoi d'e-mail de validation :", err)
    }
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

  const mailCase = await prisma.mailCase.findUnique({
    where: { id: mailId },
    select: { subject: true, reference: true }
  })

  if (mailCase) {
    await handleCommentMentions(
      content.trim(),
      session.userId,
      'MailCase',
      mailId,
      mailCase.subject || mailCase.reference
    )
  }

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
      if (doc.extractedText) {
        contentForAi = doc.extractedText
        mimeType = "text/plain"
      } else {
        const buffer = await getDocumentBuffer(doc)
        if (
          doc.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          doc.originalName.endsWith('.docx')
        ) {
          const { extractTextFromDocx } = await import('@/lib/document-parser')
          const text = extractTextFromDocx(buffer)
          contentForAi = text
          mimeType = "text/plain"
          // Sauvegarde du texte extrait pour accélérer les futures analyses
          try {
            await prisma.document.update({
              where: { id: doc.id },
              data: { extractedText: text }
            })
          } catch (dbErr) {
            console.error('[analyzeMailCaseAction] Erreur lors de la sauvegarde du texte extrait dans la BDD:', dbErr)
          }
        } else {
          contentForAi = buffer.toString('base64')
          mimeType = doc.mimeType
        }
      }
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

export async function applyMailMetadataAction(mailCaseId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_MAILS')

  const mail = await prisma.mailCase.findUnique({ where: { id: mailCaseId } })
  if (!mail) return { error: 'Courrier introuvable.' }
  if (!mail.aiAnalysis) return { error: "Aucune analyse IA disponible pour ce courrier." }

  const analysis = mail.aiAnalysis as any
  const metadata = analysis.metadata || {}
  const analyseDetails = analysis.analyse || {}

  const updateData: any = {}

  if (metadata.expediteur_nom) {
    if (mail.type === 'ENTRANT') {
      updateData.senderName = metadata.expediteur_nom
    } else {
      updateData.recipientName = metadata.expediteur_nom
    }
  }

  if (metadata.objet) {
    updateData.subject = metadata.objet
  }

  if (metadata.commune) {
    updateData.city = metadata.commune
  }

  if (analyseDetails.urgence) {
    updateData.urgency = analyseDetails.urgence === 'élevée' ? 'HAUTE' : 'NORMALE'
  }

  if (analyseDetails.type_courrier) {
    switch (analyseDetails.type_courrier) {
      case 'demande_intervention':
      case 'demande_soutien':
        updateData.category = 'DEMANDE_INTERVENTION'
        break
      case 'invitation':
      case 'demande_rdv':
        updateData.category = 'INVITATION'
        break
      case 'reclamation':
        updateData.category = 'RECLAMATION'
        break
      case 'autre':
      default:
        updateData.category = 'INFORMATION'
        break
    }
  }

  try {
    await prisma.mailCase.update({
      where: { id: mailCaseId },
      data: updateData
    })
    // Trigger workflows
    await triggerMailCaseWorkflows(mailCaseId, session.userId)

    revalidatePath(`/mails/${mailCaseId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[applyMailMetadataAction] error:', err)
    return { error: `Erreur lors de la mise à jour : ${err.message || err}` }
  }
}

export async function triggerMailCaseWorkflows(mailCaseId: string, currentUserId: string | null) {
  const mail = await prisma.mailCase.findUnique({
    where: { id: mailCaseId },
    include: {
      links: {
        where: { taskId: { not: null } },
        include: { task: true }
      }
    }
  })

  if (!mail) return

  const existingTaskTitles = mail.links.map(l => l.task?.title).filter(Boolean) as string[]

  const ensureWorkflowTask = async (title: string, priority: string, dueInBusinessDays: number, description: string) => {
    if (existingTaskTitles.includes(title)) {
      return
    }

    const dueDate = addBusinessDays(new Date(), dueInBusinessDays)

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        status: 'A_FAIRE',
        dueDate,
        assigneeId: mail.assigneeId || null
      }
    })

    await prisma.globalLink.create({
      data: {
        mailCaseId,
        taskId: task.id
      }
    })

    if (mail.assigneeId && mail.assigneeId !== currentUserId) {
      await prisma.notification.create({
        data: {
          userId: mail.assigneeId,
          type: 'ASSIGNED',
          title: 'Nouvelle tâche assignée',
          message: `La tâche "${title}" vous a été assignée.`,
          relatedType: 'Task',
          relatedId: task.id,
          severity: 'INFO'
        }
      })
    }
  }

  // 1. Urgence Haute
  if (mail.urgency === 'HAUTE') {
    const title = `[URGENT] Traiter le courrier : ${mail.reference}`
    await ensureWorkflowTask(
      title,
      'HAUTE',
      2,
      `Tâche générée automatiquement suite au marquage du courrier ${mail.reference} comme urgent.`
    )
  }

  // 2. Catégorie Demande d'intervention
  if (mail.category === 'DEMANDE_INTERVENTION') {
    const title = `Préparer courrier d'intervention : ${mail.reference}`
    await ensureWorkflowTask(
      title,
      'NORMALE',
      5,
      `Tâche générée automatiquement suite au marquage du courrier ${mail.reference} sous la catégorie "Demande d'intervention".`
    )
  }

  // 3. Catégorie Réclamation
  if (mail.category === 'RECLAMATION') {
    const title = `Rédiger projet de réponse : ${mail.reference}`
    await ensureWorkflowTask(
      title,
      'NORMALE',
      5,
      `Tâche générée automatiquement suite au marquage du courrier ${mail.reference} sous la catégorie "Réclamation".`
    )
  }
}

export async function linkExistingContactAction(mailId: string, contactId: string) {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    // Supprimer les liens de contact existants pour ce courrier
    await prisma.globalLink.deleteMany({
      where: {
        mailCaseId: mailId,
        contactId: { not: null }
      }
    })

    // Créer la nouvelle liaison
    await prisma.globalLink.create({
      data: {
        mailCaseId: mailId,
        contactId: contactId
      }
    })

    await logAudit('LINK_CONTACT', 'MailCase', mailId, session.userId, { contactId })

    revalidatePath(`/mails/${mailId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[linkExistingContactAction] error:', err)
    return { error: `Erreur lors de la liaison : ${err.message || err}` }
  }
}

export async function createAndLinkContactAction(mailId: string, metadata: any) {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    const rawName = metadata?.expediteur_nom || 'Inconnu'
    const parsed = parseFullName(rawName)

    const email = metadata?.expediteur_coordonnees?.email || null
    const phone = metadata?.expediteur_coordonnees?.telephone || null
    const address = metadata?.expediteur_coordonnees?.adresse || null
    const city = metadata?.commune || null

    // Déterminer le type de contact par rapport à expediteur_qualite
    let contactType = 'ELECTEUR'
    if (metadata?.expediteur_qualite) {
      const qualite = metadata.expediteur_qualite
      if (qualite === 'élu') {
        contactType = 'ELU'
      } else if (qualite === 'association') {
        contactType = 'ASSO'
      } else if (qualite === 'institutionnel' || qualite === 'entreprise') {
        contactType = 'PARTENAIRE'
      } else if (qualite === 'autre') {
        contactType = 'AUTRE'
      }
    }

    // Créer le contact
    const contact = await prisma.contact.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email,
        phone,
        address,
        city,
        type: contactType,
        createdById: session.userId
      }
    })

    await logAudit('CREATE', 'Contact', contact.id, session.userId, contact)

    // Supprimer les liens de contact existants pour ce courrier
    await prisma.globalLink.deleteMany({
      where: {
        mailCaseId: mailId,
        contactId: { not: null }
      }
    })

    // Lier le contact
    await prisma.globalLink.create({
      data: {
        mailCaseId: mailId,
        contactId: contact.id
      }
    })

    await logAudit('LINK_CONTACT', 'MailCase', mailId, session.userId, { contactId: contact.id })

    revalidatePath(`/mails/${mailId}`)
    return { success: true, contactId: contact.id }
  } catch (err: any) {
    console.error('[createAndLinkContactAction] error:', err)
    return { error: `Erreur lors de la création et liaison : ${err.message || err}` }
  }
}

export async function deleteMailAction(formData: FormData) {
  const session = await requireWriteAccess()
  
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Non autorisé. Seuls les administrateurs et superviseurs peuvent supprimer un courrier.')
  }

  const mailId = formData.get('mailId') as string
  if (!mailId) throw new Error('Identifiant manquant')

  await prisma.mailCase.delete({
    where: { id: mailId }
  })

  await logAudit('DELETE', 'MailCase', mailId, session.userId, { action: 'DELETE_MAIL' })

  revalidatePath('/mails')
  redirect('/mails')
}

export async function archiveMailPdfAction(mailId: string, pdfBase64: string, filename: string) {
  const session = await requireWriteAccess()
  const { v4: uuidv4 } = await import('uuid')
  const buffer = Buffer.from(pdfBase64, 'base64')
  const storageName = uuidv4() + '.pdf'
  let storagePath = ''
  let isLocal = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const useSupabase = supabaseUrl && 
                      supabaseUrl !== 'https://dummy.supabase.co' &&
                      process.env.SUPABASE_SERVICE_ROLE_KEY &&
                      process.env.SUPABASE_SERVICE_ROLE_KEY !== 'dummy'

  if (useSupabase) {
    try {
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-attachments')
        .upload(`documents/${storageName}`, buffer, {
          contentType: 'application/pdf',
          upsert: false
        })
      if (!uploadError) {
        isLocal = false
        storagePath = uploadData.path
      }
    } catch (err) {
      console.error('Supabase upload error:', err)
    }
  }

  if (isLocal) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch (e) {}
    await fs.writeFile(path.join(uploadDir, storageName), buffer)
    storagePath = `/uploads/${storageName}`
  }

  await prisma.document.create({
    data: {
      title: filename.replace('.pdf', ''),
      documentType: 'COURRIER',
      confidentiality: 'INTERNE',
      originalName: filename,
      storageName,
      extension: '.pdf',
      mimeType: 'application/pdf',
      size: buffer.length,
      storagePath,
      uploadedById: session.userId,
      mailCaseId: mailId
    }
  })

  revalidatePath(`/mails/${mailId}`)
  return { success: true }
}

export async function sendMailPdfByEmailAction(
  mailId: string,
  pdfBase64: string,
  filename: string,
  recipientEmail: string,
  recipientName: string
) {
  await requireWriteAccess()
  const { sendBrevoEmailWithAttachment } = await import('@/lib/brevo')

  const subject = `Votre courrier : Réponse du Cabinet de Lionel TIVOLI`
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <p>Bonjour ${recipientName},</p>
      <p>Veuillez trouver ci-joint la réponse officielle de Monsieur le Député Lionel TIVOLI concernant votre courrier.</p>
      <p>Restant à votre entière disposition.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 0.85em; color: #64748b; margin-bottom: 0;">Secrétariat du Député Lionel TIVOLI • Circonscription des Alpes-Maritimes</p>
    </div>
  `

  await sendBrevoEmailWithAttachment(
    recipientEmail,
    recipientName,
    subject,
    htmlContent,
    pdfBase64,
    filename
  )

  return { success: true }
}

export async function archiveMailHtmlAction(mailId: string, htmlContent: string, filename: string) {
  const session = await requireWriteAccess()
  const { v4: uuidv4 } = await import('uuid')
  const buffer = Buffer.from(htmlContent, 'utf-8')
  const storageName = uuidv4() + '.html'
  let storagePath = ''
  let isLocal = true

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const useSupabase = supabaseUrl && 
                      supabaseUrl !== 'https://dummy.supabase.co' &&
                      process.env.SUPABASE_SERVICE_ROLE_KEY &&
                      process.env.SUPABASE_SERVICE_ROLE_KEY !== 'dummy'

  if (useSupabase) {
    try {
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('crm-attachments')
        .upload(`documents/${storageName}`, buffer, {
          contentType: 'text/html',
          upsert: false
        })
      if (!uploadError) {
        isLocal = false
        storagePath = uploadData.path
      }
    } catch (err) {
      console.error('Supabase upload error:', err)
    }
  }

  if (isLocal) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch (e) {}
    await fs.writeFile(path.join(uploadDir, storageName), buffer)
    storagePath = `/uploads/${storageName}`
  }

  await prisma.document.create({
    data: {
      title: filename.replace('.html', ''),
      documentType: 'COURRIER',
      confidentiality: 'INTERNE',
      originalName: filename,
      storageName,
      extension: '.html',
      mimeType: 'text/html',
      size: buffer.length,
      storagePath,
      uploadedById: session.userId,
      mailCaseId: mailId
    }
  })

  revalidatePath(`/mails/${mailId}`)
  return { success: true }
}

export async function applyHtmlTemplateToMailAction(mailId: string, templateId: string): Promise<{ success: boolean, error?: string }> {
  let session
  try {
    session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_MAILS')
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  try {
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId }
    })
    if (!template) {
      return { success: false, error: 'Modèle introuvable.' }
    }
    if (!template.htmlContent) {
      return { success: false, error: "Ce modèle n'est pas un modèle HTML." }
    }

    const mail = await prisma.mailCase.findUnique({
      where: { id: mailId },
      include: {
        assignee: { select: { name: true } },
        links: {
          include: {
            contact: true
          }
        }
      }
    })

    if (!mail) {
      return { success: false, error: 'Courrier introuvable.' }
    }

    // Récupérer le contact principal
    const primaryContact = mail.links.find(l => l.contact)?.contact || ({} as any)
    const civilite = primaryContact.gender === 'M' || primaryContact.gender === 'H' ? 'Monsieur' : primaryContact.gender === 'F' ? 'Madame' : 'Monsieur/Madame'
    const fullAddress = primaryContact.city
      ? `${primaryContact.streetNumber || ''} ${primaryContact.streetName || ''}\n${primaryContact.postalCode || ''} ${primaryContact.city}`
      : (mail.city || '')

    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    const enTete = `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #ef4444; padding-bottom: 0.75rem; margin-bottom: 2.5rem; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <div style="width: 4px; height: 35px; background-color: #1e3a8a; display: inline-block;"></div>
          <div style="width: 4px; height: 35px; background-color: #ffffff; border: 1px solid #cbd5e1; display: inline-block;"></div>
          <div style="width: 4px; height: 35px; background-color: #b91c1c; display: inline-block;"></div>
          <div style="margin-left: 0.5rem; display: inline-block; vertical-align: middle; text-align: left;">
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; line-height: 1.1;">Assemblée Nationale</h3>
            <p style="margin: 0; font-size: 0.78rem; font-weight: 600; color: #475569;">Lionel TIVOLI • Député</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 0.7rem; color: #64748b; line-height: 1.25;">
          <p style="margin: 0; font-weight: 700; color: #1e293b;">Alpes-Maritimes (2ème Circonscription)</p>
          <p style="margin: 0;">contact@lioneltivoli.fr • www.lioneltivoli.fr</p>
        </div>
      </div>
    `

    const signature = `
      <div style="margin-top: 2rem; text-align: right; float: right; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <p style="margin-bottom: 0.25rem; font-weight: 700; font-size: 0.9rem; color: #1e293b;">Lionel TIVOLI</p>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0; margin-bottom: 0.25rem;">Député des Alpes-Maritimes</p>
        <div style="font-family: 'Caveat', cursive, sans-serif; font-size: 2.2rem; color: #1d4ed8; transform: rotate(-4deg); display: inline-block; margin-top: 0.25rem; font-weight: 700;">
          Lionel Tivoli
        </div>
      </div>
    `

    const variablesMap: Record<string, string> = {
      '{en_tete_officielle}': enTete,
      '{civilite_expediteur}': civilite,
      '{expediteur_prenom}': primaryContact.firstName || '',
      '{expediteur_nom}': primaryContact.lastName || '',
      '{expediteur_adresse}': fullAddress.replace(/\n/g, '<br />'),
      '{reference}': mail.reference,
      '{objet}': mail.subject,
      '{date_courrier}': dateStr,
      '{corps_reponse}': mail.content || '',
      '{nom_collaborateur}': mail.assignee?.name || '',
      '{signature_elu}': signature
    }

    let mergedHtml = template.htmlContent

    Object.entries(variablesMap).forEach(([key, value]) => {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      mergedHtml = mergedHtml.replace(new RegExp(escapedKey, 'g'), value)
    })

    // Enregistrer une nouvelle version dans l'historique des révisions
    await prisma.mailVersion.create({
      data: {
        mailCaseId: mailId,
        subject: mail.subject,
        content: mail.content,
        editedById: session.userId
      }
    })

    // Mettre à jour mail.content
    await prisma.mailCase.update({
      where: { id: mailId },
      data: {
        content: mergedHtml
      }
    })

    await logAudit('apply_template', 'MailCase', mailId, session.userId, { templateId })

    revalidatePath(`/mails/${mailId}`)
    revalidatePath('/mails')

    return { success: true }
  } catch (error: any) {
    console.error('[applyHtmlTemplateToMailAction] Error:', error)
    return { success: false, error: error.message || 'Erreur lors de la fusion du modèle.' }
  }
}

export async function updateMailContentAction(
  mailId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  let session
  try {
    session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_MAILS')
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  try {
    const existing = await prisma.mailCase.findUnique({ where: { id: mailId } })
    if (!existing) return { success: false, error: 'Courrier introuvable.' }

    if (existing.content !== content) {
      const lastVersion = await prisma.mailVersion.findFirst({
        where: { mailCaseId: mailId },
        orderBy: { createdAt: 'desc' }
      })
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      if (!lastVersion || lastVersion.createdAt < twoMinutesAgo || lastVersion.editedById !== session.userId) {
        await prisma.mailVersion.create({
          data: {
            mailCaseId: mailId,
            subject: existing.subject,
            content: existing.content || '',
            editedById: session.userId
          }
        })
      }
    }

    await prisma.mailCase.update({
      where: { id: mailId },
      data: {
        content: content
      }
    })

    await logAudit('UPDATE_CONTENT', 'MailCase', mailId, session.userId, { length: content.length })

    revalidatePath(`/mails/${mailId}`)
    revalidatePath('/mails')
    return { success: true }
  } catch (err: any) {
    console.error('[updateMailContentAction] error:', err)
    return { success: false, error: err.message || 'Erreur lors de la mise à jour du contenu.' }
  }
}

export async function generateAiResponseAction(
  mailId: string,
  instruction: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  let session
  try {
    session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_MAILS')
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  const mailEnabledSetting = await prisma.setting.findUnique({ where: { key: 'ai.mail_enabled' } })
  if (mailEnabledSetting?.value !== 'true') {
    return { success: false, error: 'L\'assistant IA est désactivé globalement.' }
  }

  try {
    const mail = await prisma.mailCase.findUnique({
      where: { id: mailId },
      include: { parentMailCase: true }
    })
    if (!mail) {
      return { success: false, error: 'Courrier introuvable.' }
    }

    let incomingContent = ''
    if (mail.type === 'ENTRANT') {
      incomingContent = mail.content || mail.subject || ''
    } else if (mail.parentMailCase) {
      incomingContent = mail.parentMailCase.content || mail.parentMailCase.subject || ''
    } else {
      incomingContent = mail.content || mail.subject || ''
    }

    if (!incomingContent) {
      return { success: false, error: "Aucun contenu de courrier entrant trouvé pour servir de contexte." }
    }

    const { generateSingleResponse } = await import('@/lib/gemini')
    const aiResponse = await generateSingleResponse(incomingContent, instruction)

    return { success: true, text: aiResponse.text }
  } catch (err: any) {
    console.error('[generateAiResponseAction] error:', err)
    return { success: false, error: err.message || "Erreur de génération avec Gemini." }
  }
}


