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

  const validatedFields = taskSchema.safeParse({
    title, description, priority, status, assigneeId, expectedDeliverable
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0].message }
  }

  const validData = validatedFields.data

  let dueDate = null
  if (dueDateStr) {
    dueDate = new Date(dueDateStr)
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: validData.title,
        description: validData.description || null,
        priority: validData.priority || 'NORMALE',
        status: validData.status || 'A_FAIRE',
        assigneeId: validData.assigneeId || null,
        dueDate,
        expectedDeliverable: validData.expectedDeliverable || null
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

    if (assigneeId && assigneeId !== session.userId) {
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

    await logAudit('CREATE', 'Task', task.id, session.userId, { title, priority, status, assigneeId })

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
