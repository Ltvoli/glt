'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

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
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Task',
        entityId: id,
        userId: session.userId,
        oldValues: JSON.stringify(task),
        newValues: JSON.stringify(updatedTask)
      }
    })

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

  await prisma.taskComment.create({
    data: {
      content,
      taskId
    }
  })

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}
