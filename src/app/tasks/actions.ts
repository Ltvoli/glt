'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function createTask(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  let session
  try {
    session = await requireWriteAccess()
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

  if (!title) {
    return { error: 'Le titre est obligatoire.' }
  }

  let dueDate = null
  if (dueDateStr) {
    dueDate = new Date(dueDateStr)
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'NORMALE',
        status: status || 'A_FAIRE',
        assigneeId: assigneeId || null,
        dueDate,
        expectedDeliverable: expectedDeliverable || null
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

  await logAudit('UPDATE_STATUS', 'Task', taskId, session.userId, { status: task.status }, { status: newStatus })

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
}
