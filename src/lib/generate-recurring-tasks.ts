import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export function getNextOccurrenceDate(current: Date, pattern: string, interval: number): Date {
  const next = new Date(current)
  if (pattern === 'DAILY') {
    next.setDate(next.getDate() + interval)
  } else if (pattern === 'WEEKLY') {
    next.setDate(next.getDate() + 7 * interval)
  } else if (pattern === 'MONTHLY') {
    next.setMonth(next.getMonth() + interval)
  } else {
    next.setDate(next.getDate() + interval)
  }
  return next
}

export async function generateRecurringTasks() {
  const now = new Date()

  // Find all active templates that are due
  const templates = await prisma.task.findMany({
    where: {
      isTemplate: true,
      isRecurring: true,
      nextOccurrence: { lte: now }
    },
    include: {
      subtasks: true,
      tags: { include: { tag: true } }
    }
  })

  let spawnedCount = 0

  for (const template of templates) {
    if (!template.nextOccurrence) continue

    let next = new Date(template.nextOccurrence)
    const pattern = template.recurrencePattern || 'DAILY'
    const interval = template.recurrenceInterval || 1

    // Catch up loop
    while (next <= now) {
      // 1. Create task instance
      const spawnedTask = await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          priority: template.priority,
          status: 'A_FAIRE', // Always start generated tasks at A_FAIRE
          dueDate: next,
          expectedDeliverable: template.expectedDeliverable,
          assigneeId: template.assigneeId,
          isRecurring: true,
          isTemplate: false,
          parentTaskId: template.id
        }
      })

      // 2. Clone subtasks
      if (template.subtasks.length > 0) {
        for (const sub of template.subtasks) {
          await prisma.subtask.create({
            data: {
              taskId: spawnedTask.id,
              title: sub.title,
              isCompleted: false
            }
          })
        }
      }

      // 3. Clone tags
      if (template.tags.length > 0) {
        for (const tt of template.tags) {
          await prisma.taskTag.create({
            data: {
              taskId: spawnedTask.id,
              tagId: tt.tagId
            }
          })
        }
      }

      // Send assignee notification
      if (template.assigneeId) {
        await prisma.notification.create({
          data: {
            userId: template.assigneeId,
            type: 'ASSIGNED',
            title: 'Nouvelle occurrence de tâche',
            message: `Une nouvelle instance de la tâche récurrente "${template.title}" vous a été assignée. Elle est due pour le ${next.toLocaleDateString('fr-FR')}.`,
            relatedType: 'Task',
            relatedId: spawnedTask.id,
            severity: 'INFO'
          }
        })
      }

      await logAudit('CREATE', 'Task', spawnedTask.id, null, {
        spawnedFromTemplateId: template.id,
        dueDate: next,
        action: 'SPAWN_RECURRING'
      })

      spawnedCount++

      // Move next to the next slot
      next = getNextOccurrenceDate(next, pattern, interval)
    }

    // Update template's nextOccurrence
    await prisma.task.update({
      where: { id: template.id },
      data: {
        nextOccurrence: next
      }
    })
  }

  return spawnedCount
}
