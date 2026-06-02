'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function createTask(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as string
  const status = formData.get('status') as string
  const assigneeId = formData.get('assigneeId') as string
  const dueDateStr = formData.get('dueDate') as string

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
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Task',
        entityId: task.id,
        userId: session.userId,
        newValues: JSON.stringify({ title, priority, status, assigneeId })
      }
    })

  } catch (error) {
    return { error: 'Erreur lors de la création de la tâche.' }
  }

  redirect('/tasks')
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

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

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_STATUS',
      entityType: 'Task',
      entityId: taskId,
      userId: session.userId,
      oldValues: JSON.stringify({ status: task.status }),
      newValues: JSON.stringify({ status: newStatus })
    }
  })
}
