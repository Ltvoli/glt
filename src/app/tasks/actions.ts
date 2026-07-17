'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { taskSchema } from '@/lib/validations'
import { requirePermission } from '@/lib/permissions'

export async function createTask(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_TASKS')
  } catch (e: any) {
    return { error: e.message }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as string
  const status = formData.get('status') as string
  const assigneeId = formData.get('assigneeId') as string
  const dueDateStr = formData.get('dueDate') as string
  const expectedDeliverable = formData.get('expectedDeliverable') as string
  const tagsStr = formData.get('tags') as string

  // Recurrence fields
  const isRecurring = formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true'
  const recurrencePattern = formData.get('recurrencePattern') as string
  const recurrenceIntervalStr = formData.get('recurrenceInterval') as string
  const startDateStr = formData.get('startDate') as string

  const validatedFields = taskSchema.safeParse({
    title, description, priority, status, assigneeId, expectedDeliverable
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const validData = validatedFields.data

  let dueDate = null
  if (dueDateStr && !isRecurring) {
    dueDate = new Date(dueDateStr)
  }

  let nextOccurrence = null
  if (isRecurring && startDateStr) {
    nextOccurrence = new Date(startDateStr)
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: validData.title,
        description: validData.description || null,
        priority: validData.priority || 'NORMALE',
        status: isRecurring ? 'A_FAIRE' : (validData.status || 'A_FAIRE'),
        assigneeId: validData.assigneeId || null,
        dueDate,
        expectedDeliverable: validData.expectedDeliverable || null,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        recurrenceInterval: isRecurring && recurrenceIntervalStr ? parseInt(recurrenceIntervalStr) : null,
        nextOccurrence,
        isTemplate: isRecurring
      }
    })

    if (tagsStr) {
      const tagNames = tagsStr.split(',').map(t => t.trim()).filter(t => t)
      for (const tagName of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, color: '#e2e8f0' }
        })
        await prisma.taskTag.create({
          data: { taskId: task.id, tagId: tag.id }
        })
      }
    }

    const contactId = formData.get('contactId') as string
    if (contactId) {
      await prisma.globalLink.create({
        data: {
          taskId: task.id,
          contactId: contactId
        }
      })
    }

    const mailCaseId = formData.get('mailCaseId') as string
    if (mailCaseId) {
      await prisma.globalLink.create({
        data: {
          taskId: task.id,
          mailCaseId: mailCaseId
        }
      })
    }

    const questionId = formData.get('questionId') as string
    if (questionId) {
      await prisma.globalLink.create({
        data: {
          taskId: task.id,
          questionId: questionId
        }
      })
    }

    // Process attachments
    const files = formData.getAll('attachments') as File[]
    if (files && files.length > 0) {
      const path = await import('path')
      const { v4: uuidv4 } = await import('uuid')
      const fs = await import('fs/promises')
      const { supabase } = await import('@/lib/supabase')

      const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/csv',
        'text/plain',
        'image/jpeg',
        'image/png'
      ]

      for (const file of files) {
        if (!file || file.size === 0 || !file.name) continue

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          console.warn(`File type not allowed: ${file.type} for file ${file.name}`)
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const storageName = uuidv4()
        const extension = path.extname(file.name) || ('.' + file.name.split('.').pop())
        const fileName = `${storageName}${extension}`
        
        let isLocal = true
        let storagePath = ''
        
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
              .upload(`documents/${fileName}`, buffer, {
                contentType: file.type,
                upsert: false
              })
            
            if (!uploadError) {
              isLocal = false
              storagePath = uploadData.path
            } else {
              console.error('Supabase upload error, falling back to local:', uploadError)
            }
          } catch (err) {
            console.error('Supabase upload exception, falling back to local:', err)
          }
        }

        if (isLocal) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads')
          try {
            await fs.mkdir(uploadDir, { recursive: true })
          } catch(e) {}
          
          const filePath = path.join(uploadDir, fileName)
          try {
            await fs.writeFile(filePath, buffer)
            storagePath = filePath
          } catch (fsError) {
            console.error('Local upload error:', fsError)
            continue
          }
        }

        let extractedText = ''
        try {
          if (file.type === 'application/pdf') {
            try {
              const pdfParseLib = await import('pdf-parse')
              const pdfParseFn = (pdfParseLib as any).default ?? pdfParseLib
              const pdfData = await pdfParseFn(buffer)
              extractedText = pdfData.text
            } catch (e) {
              console.error('Erreur de parsing PDF:', e)
            }
          } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.endsWith('.docx')
          ) {
            try {
              const { extractTextFromDocx } = await import('@/lib/document-parser')
              extractedText = extractTextFromDocx(buffer)
            } catch (e) {
              console.error('Erreur de parsing DOCX:', e)
            }
          }
        } catch (ocrError) {
          console.error('OCR/Parse error:', ocrError)
        }

        await prisma.document.create({
          data: {
            title: file.name,
            documentType: 'AUTRE',
            originalName: file.name,
            storageName: fileName,
            extension,
            mimeType: file.type,
            size: file.size,
            storagePath,
            confidentiality: 'INTERNE',
            status: 'VALIDATED',
            uploadedById: session.userId,
            extractedText: extractedText.trim() || null,
            taskId: task.id
          }
        })
      }
    }

    if (!isRecurring && assigneeId && assigneeId !== session.userId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'ASSIGNED',
          title: 'Nouvelle tâche assignée',
          message: `La tâche "${title}" vous a été assignée.`,
          relatedType: 'Task',
          relatedId: task.id,
          severity: 'INFO'
        }
      })
    }

    await logAudit('CREATE', 'Task', task.id, session.userId, { 
      title, 
      priority, 
      status: task.status, 
      assigneeId,
      isRecurring,
      isTemplate: task.isTemplate
    })

    if (isRecurring) {
      const { generateRecurringTasks } = await import('@/lib/generate-recurring-tasks')
      await generateRecurringTasks()
    }

  } catch (error) {
    return { error: 'Erreur lors de la création de la tâche.' }
  }

  redirect('/tasks')
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) throw new Error('Tâche introuvable')

  let completedAt = task.completedAt
  let cancelledAt = task.cancelledAt

  if (newStatus === 'TERMINEE' && task.status !== 'TERMINEE') {
    completedAt = new Date()
  } else if (newStatus !== 'TERMINEE') {
    completedAt = null
  }

  if (newStatus === 'ANNULEE' && task.status !== 'ANNULEE') {
    cancelledAt = new Date()
  } else if (newStatus !== 'ANNULEE') {
    cancelledAt = null
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: newStatus,
      completedAt,
      cancelledAt
    }
  })

  if (task.assigneeId && task.assigneeId !== session.userId) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'STATUS_CHANGE',
        title: 'Changement de statut',
        message: `Le statut de la tâche "${task.title}" est passé à "${newStatus}".`,
        relatedType: 'Task',
        relatedId: task.id,
        severity: 'INFO'
      }
    })
  }

  await logAudit('UPDATE_STATUS', 'Task', taskId, session.userId, {
    oldStatus: task.status,
    newStatus
  })

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
}

export async function batchUpdateTaskStatus(taskIds: string[], status: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  let completedAt = null
  let cancelledAt = null

  if (status === 'TERMINEE') completedAt = new Date()
  if (status === 'ANNULEE') cancelledAt = new Date()

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { 
      status,
      completedAt,
      cancelledAt
    }
  })

  for (const id of taskIds) {
    await logAudit('UPDATE_STATUS', 'Task', id, session.userId, { action: 'BATCH_UPDATE', newStatus: status })
    revalidatePath(`/tasks/${id}`)
  }

  revalidatePath('/tasks')
}
