import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const in48h = new Date(today)
    in48h.setDate(in48h.getDate() + 2)

    // 1. Tâches en retard (dueDate < today et statut non terminé/annulé)
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['TERMINEE', 'ANNULEE'] },
        assigneeId: { not: null }
      }
    })

    for (const task of overdueTasks) {
      if (!task.assigneeId) continue
      // Vérifier si la notification existe déjà pour ne pas spammer
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          relatedId: task.id,
          type: 'OVERDUE',
          readAt: null
        }
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'OVERDUE',
            title: 'Tâche en retard',
            message: `La tâche "${task.title}" devait être terminée le ${new Date(task.dueDate!).toLocaleDateString('fr-FR')}.`,
            relatedType: 'Task',
            relatedId: task.id,
            severity: 'URGENT'
          }
        })
      }
    }

    // 2. Tâches à échéance demain
    const dueTomorrowTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: tomorrow, lt: in48h },
        status: { notIn: ['TERMINEE', 'ANNULEE'] },
        assigneeId: { not: null }
      }
    })

    for (const task of dueTomorrowTasks) {
      if (!task.assigneeId) continue
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          relatedId: task.id,
          type: 'DUE_TOMORROW',
          readAt: null
        }
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'DUE_TOMORROW',
            title: 'Échéance demain',
            message: `La tâche "${task.title}" arrive à échéance demain.`,
            relatedType: 'Task',
            relatedId: task.id,
            severity: 'WARNING'
          }
        })
      }
    }

    // 3. Courriers en retard (responseDueDate < today et statut non répondu/classé)
    const overdueMails = await prisma.mailCase.findMany({
      where: {
        responseDueDate: { lt: today },
        status: { notIn: ['REPONDU', 'CLASSE'] },
        assigneeId: { not: null }
      }
    })

    for (const mail of overdueMails) {
      if (!mail.assigneeId) continue
      const existing = await prisma.notification.findFirst({
        where: { userId: mail.assigneeId, relatedId: mail.id, type: 'MAIL_OVERDUE', readAt: null }
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: mail.assigneeId,
            type: 'MAIL_OVERDUE',
            title: 'Courrier en retard',
            message: `Le courrier "${mail.subject}" devait être traité avant le ${new Date(mail.responseDueDate!).toLocaleDateString('fr-FR')}.`,
            relatedType: 'MailCase',
            relatedId: mail.id,
            severity: 'URGENT'
          }
        })
      }
    }

    // 4. Courriers à échéance demain
    const dueTomorrowMails = await prisma.mailCase.findMany({
      where: {
        responseDueDate: { gte: tomorrow, lt: in48h },
        status: { notIn: ['REPONDU', 'CLASSE'] },
        assigneeId: { not: null }
      }
    })

    for (const mail of dueTomorrowMails) {
      if (!mail.assigneeId) continue
      const existing = await prisma.notification.findFirst({
        where: { userId: mail.assigneeId, relatedId: mail.id, type: 'MAIL_DUE_TOMORROW', readAt: null }
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: mail.assigneeId,
            type: 'MAIL_DUE_TOMORROW',
            title: 'Échéance courrier demain',
            message: `Le délai de traitement du courrier "${mail.subject}" expire demain.`,
            relatedType: 'MailCase',
            relatedId: mail.id,
            severity: 'WARNING'
          }
        })
      }
    }

    // 5. QE en retard (> 60 jours sans réponse)
    const sixtyDaysAgo = new Date(today)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const overdueQEs = await prisma.writtenQuestion.findMany({
      where: {
        status: 'VALIDER',
        depositDate: { lt: sixtyDaysAgo },
        assigneeId: { not: null },
        archivedAt: null
      }
    })

    for (const qe of overdueQEs) {
      if (!qe.assigneeId) continue
      const existing = await prisma.notification.findFirst({
        where: { userId: qe.assigneeId, relatedId: qe.id, type: 'QE_OVERDUE', readAt: null }
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: qe.assigneeId,
            type: 'QE_OVERDUE',
            title: 'Alerte : QE sans réponse',
            message: `La question "${qe.title}" est en attente depuis plus de 60 jours.`,
            relatedType: 'WrittenQuestion',
            relatedId: qe.id,
            severity: 'URGENT'
          }
        })
      }
    }

    // 6. QE - Retours à faire (Réponse reçue)
    const followUpQEs = await prisma.writtenQuestion.findMany({
      where: {
        status: 'TERMINE',
        followUpDescription: { not: null },
        assigneeId: { not: null },
        archivedAt: null
      }
    })

    for (const qe of followUpQEs) {
      if (!qe.assigneeId) continue
      const existing = await prisma.notification.findFirst({
        where: { userId: qe.assigneeId, relatedId: qe.id, type: 'QE_FOLLOWUP' } // on cherche même les lues pour ne pas spammer tous les jours
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: qe.assigneeId,
            type: 'QE_FOLLOWUP',
            title: 'Retour à faire (QE)',
            message: `Une réponse a été reçue pour "${qe.title}". N'oubliez pas : ${qe.followUpDescription}`,
            relatedType: 'WrittenQuestion',
            relatedId: qe.id,
            severity: 'WARNING'
          }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      overdueCount: overdueTasks.length, 
      dueTomorrowCount: dueTomorrowTasks.length,
      overdueMailsCount: overdueMails.length,
      dueTomorrowMailsCount: dueTomorrowMails.length,
      overdueQECount: overdueQEs.length,
      followUpQECount: followUpQEs.length
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erreur lors de la génération des notifications' }, { status: 500 })
  }
}
