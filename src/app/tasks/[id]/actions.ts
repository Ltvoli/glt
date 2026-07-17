'use server'

import prisma from '@/lib/prisma'
import { getSession, requireWriteAccess } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { requirePermission } from '@/lib/permissions'

export async function updateTask(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as string
  const status = formData.get('status') as string
  const assigneeId = formData.get('assigneeId') as string
  const dueDateStr = formData.get('dueDate') as string
  const expectedDeliverable = formData.get('expectedDeliverable') as string
  const tagsStr = formData.get('tags') as string
  const mailCaseId = formData.get('mailCaseId') as string
  const questionId = formData.get('questionId') as string

  // Recurrence fields
  const isRecurring = formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true'
  const recurrencePattern = formData.get('recurrencePattern') as string
  const recurrenceIntervalStr = formData.get('recurrenceInterval') as string
  const startDateStr = formData.get('startDate') as string

  if (!id || !title) {
    return { error: 'Le titre est obligatoire.' }
  }

  let dueDate = null
  if (dueDateStr && !isRecurring) {
    dueDate = new Date(dueDateStr)
  }

  try {
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return { error: 'Tâche introuvable.' }

    let nextOccurrence = null
    if (isRecurring) {
      if (startDateStr) {
        nextOccurrence = new Date(startDateStr)
      } else {
        nextOccurrence = task.nextOccurrence || new Date()
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description: description || null,
        priority: priority || 'NORMALE',
        status: isRecurring ? 'A_FAIRE' : (status || 'A_FAIRE'),
        assigneeId: assigneeId || null,
        dueDate,
        expectedDeliverable: expectedDeliverable || null,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        recurrenceInterval: isRecurring && recurrenceIntervalStr ? parseInt(recurrenceIntervalStr) : null,
        nextOccurrence,
        isTemplate: isRecurring
      }
    })

    // Mise à jour des tags
    await prisma.taskTag.deleteMany({ where: { taskId: id } })
    if (tagsStr) {
      const tagNames = tagsStr.split(',').map(t => t.trim()).filter(t => t)
      for (const tagName of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName, color: '#e2e8f0' }
        })
        await prisma.taskTag.create({
          data: { taskId: id, tagId: tag.id }
        })
      }
    }

    // Notification si nouveau responsable (seulement pour tâche non-modèle)
    if (!isRecurring && assigneeId && assigneeId !== task.assigneeId && assigneeId !== session.userId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'ASSIGNED',
          title: 'Nouvelle tâche assignée',
          message: `Vous avez été assigné à la tâche "${title}" par un autre membre de l'équipe.`,
          relatedType: 'Task',
          relatedId: task.id,
          severity: 'INFO'
        }
      })
    }

    // Update linkages for mail cases and written questions
    await prisma.globalLink.deleteMany({
      where: {
        taskId: id,
        OR: [
          { mailCaseId: { not: null } },
          { questionId: { not: null } }
        ]
      }
    })

    if (mailCaseId) {
      await prisma.globalLink.create({
        data: {
          taskId: id,
          mailCaseId: mailCaseId
        }
      })
    }

    if (questionId) {
      await prisma.globalLink.create({
        data: {
          taskId: id,
          questionId: questionId
        }
      })
    }

    await logAudit('UPDATE', 'Task', id, session.userId, {
      title,
      priority,
      status: updatedTask.status,
      assigneeId,
      isRecurring,
      isTemplate: updatedTask.isTemplate
    })

    if (isRecurring) {
      const { generateRecurringTasks } = await import('@/lib/generate-recurring-tasks')
      await generateRecurringTasks()
    }

  } catch (error) {
    return { error: 'Erreur lors de la mise à jour.' }
  }

  revalidatePath(`/tasks/${id}`)
  revalidatePath(`/tasks`)
  return { success: true }
}

export async function addSubtask(taskId: string, title: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const subtask = await prisma.subtask.create({
    data: {
      title,
      taskId,
      isCompleted: false
    }
  })

  await logAudit('ADD_SUBTASK', 'Task', taskId, session.userId, { title })

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath(`/tasks`)
  return { success: true, subtask }
}

export async function toggleSubtask(subtaskId: string, isCompleted: boolean) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isCompleted }
  })

  await logAudit('TOGGLE_SUBTASK', 'Task', subtask.taskId, session.userId, { title: subtask.title, isCompleted })

  revalidatePath(`/tasks/${subtask.taskId}`)
  return { success: true }
}

export async function handleCommentMentions(
  content: string,
  authorId: string,
  relatedType: 'Task' | 'MailCase',
  relatedId: string,
  titleText: string
): Promise<string[]> {
  const mentionRegex = /@([a-zA-ZÀ-ÖØ-öø-ÿ0-9\._\-]+)/g
  const matches = [...content.matchAll(mentionRegex)]
  if (matches.length === 0) return []

  const mentionedValues = Array.from(new Set(matches.map(m => m[1])))
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true }
  })
  const authorName = author ? `${author.firstName} ${author.lastName}` : 'Un collaborateur'
  const notifiedUserIds: string[] = []

  for (const value of mentionedValues) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { equals: value, mode: 'insensitive' } },
          { lastName: { equals: value, mode: 'insensitive' } },
          { email: { equals: value, mode: 'insensitive' } }
        ],
        isActive: true
      }
    })

    for (const u of matchedUsers) {
      if (u.id === authorId) continue
      if (notifiedUserIds.includes(u.id)) continue

      await prisma.notification.create({
        data: {
          userId: u.id,
          type: 'COMMENT_ADDED',
          title: 'Vous avez été mentionné',
          message: `${authorName} vous a mentionné dans un commentaire sur ${relatedType === 'Task' ? 'la tâche' : 'le courrier'} "${titleText}".`,
          relatedType,
          relatedId,
          severity: 'INFO'
        }
      })
      notifiedUserIds.push(u.id)
    }
  }

  return notifiedUserIds
}

export async function addTaskComment(taskId: string, content: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return { error: 'Tâche introuvable' }

  await prisma.taskComment.create({
    data: {
      content,
      taskId,
      authorId: session.userId
    }
  })

  const notifiedUserIds = await handleCommentMentions(
    content,
    session.userId,
    'Task',
    taskId,
    task.title
  )

  if (task.assigneeId && task.assigneeId !== session.userId && !notifiedUserIds.includes(task.assigneeId)) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'COMMENT_ADDED',
        title: 'Nouveau commentaire',
        message: `Un commentaire a été ajouté sur la tâche "${task.title}".`,
        relatedType: 'Task',
        relatedId: task.id,
        severity: 'INFO'
      }
    })
  }

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}

export async function deleteSubtask(subtaskId: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')
  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } })
  if (!subtask) return { error: 'Introuvable' }

  await prisma.subtask.delete({
    where: { id: subtaskId }
  })

  await logAudit('DELETE_SUBTASK', 'Task', subtask.taskId, session.userId, { title: subtask.title })

  revalidatePath(`/tasks/${subtask.taskId}`)
  revalidatePath(`/tasks`)
  return { success: true }
}

export async function nudgeAssigneeAction(taskId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  })
  if (!task) return { error: 'Tâche introuvable' }
  if (!task.assigneeId) return { error: 'Aucun responsable assigné à cette tâche' }

  const caller = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true }
  })
  const callerName = caller ? `${caller.firstName} ${caller.lastName}` : 'Un collaborateur'

  await prisma.notification.create({
    data: {
      userId: task.assigneeId,
      type: 'ASSIGNED',
      title: 'Relance sur tâche',
      message: `Relance de ${callerName} : Pouvez-vous faire un point sur la tâche "${task.title}" ?`,
      relatedType: 'Task',
      relatedId: task.id,
      severity: 'WARNING'
    }
  })

  await logAudit('NUDGE', 'Task', taskId, session.userId, { assigneeId: task.assigneeId })

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath(`/tasks`)
  return { success: true }
}

export async function deleteTaskAction(formData: FormData) {
  const session = await requireWriteAccess()
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Non autorisé. Seuls les administrateurs et superviseurs peuvent supprimer une tâche.')
  }

  const taskId = formData.get('taskId') as string
  if (!taskId) throw new Error('Identifiant de la tâche manquant')

  const { redirect } = await import('next/navigation')

  await prisma.task.delete({
    where: { id: taskId }
  })

  await logAudit('DELETE', 'Task', taskId, session.userId, { action: 'DELETE_TASK' })

  revalidatePath('/tasks')
  redirect('/tasks')
}

