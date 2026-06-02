'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function updateTask(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as string
  const status = formData.get('status') as string
  const assigneeId = formData.get('assigneeId') as string
  const dueDateStr = formData.get('dueDate') as string
  const expectedDeliverable = formData.get('expectedDeliverable') as string
  const tagsStr = formData.get('tags') as string

  if (!id || !title) {
    return { error: 'Le titre est obligatoire.' }
  }

  let dueDate = null
  if (dueDateStr) {
    dueDate = new Date(dueDateStr)
  }

  try {
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return { error: 'Tâche introuvable.' }

    const updatedTask = await prisma.task.update({
      where: { id },
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

    // Notification si nouveau responsable
    if (assigneeId && assigneeId !== task.assigneeId && assigneeId !== session.userId) {
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

    await logAudit('UPDATE', 'Task', id, session.userId, updatedTask)

  } catch (error) {
    return { error: 'Erreur lors de la mise à jour.' }
  }

  revalidatePath(`/tasks/${id}`)
  revalidatePath(`/tasks`)
  return { success: true }
}

export async function addSubtask(taskId: string, title: string) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  await prisma.subtask.create({
    data: {
      title,
      taskId,
      isCompleted: false
    }
  })

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}

export async function toggleSubtask(subtaskId: string, isCompleted: boolean) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isCompleted }
  })

  revalidatePath(`/tasks/${subtask.taskId}`)
  return { success: true }
}

export async function addTaskComment(taskId: string, content: string) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return { error: 'Tâche introuvable' }

  await prisma.taskComment.create({
    data: {
      content,
      taskId
    }
  })

  if (task.assigneeId && task.assigneeId !== session.userId) {
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
