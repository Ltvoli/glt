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

    // Récupérer la liste des administrateurs et valides
    const validators = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATEUR', 'SUPERVISEUR', 'COORDINATEUR'] }, isActive: true, archivedAt: null },
      select: { id: true }
    })
    const validatorIds = validators.map(v => v.id)

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
      },
      include: {
        assignee: true
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
            message: `La tâche "${task.title}" arrives à échéance demain.`,
            relatedType: 'Task',
            relatedId: task.id,
            severity: 'WARNING'
          }
        })

        if (task.assignee?.email) {
          const { sendBrevoEmail } = await import('@/lib/brevo')
          const emailSubject = `⚠️ Échéance demain : ${task.title}`
          const emailHtml = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #b91c1c; margin-top: 0;">Rappel d'échéance de tâche</h2>
              <p>Bonjour <strong>${task.assignee.firstName}</strong>,</p>
              <p>La tâche suivante arrive à échéance demain (le ${new Date(task.dueDate!).toLocaleDateString('fr-FR')}) :</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong style="font-size: 1.1em; color: #1e293b;">${task.title}</strong>
                ${task.description ? `<p style="margin: 8px 0 0 0; color: #475569; font-size: 0.95em;">${task.description}</p>` : ''}
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.85em;">Priorité : ${task.priority}</p>
              </div>
              <p>Merci de faire le nécessaire pour la finaliser ou de mettre à jour son statut dans l'application.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 0.85em; color: #64748b; margin-bottom: 0;">Ceci est un e-mail automatique envoyé par votre CRM Cabinet.</p>
            </div>
          `
          try {
            await sendBrevoEmail(task.assignee.email, `${task.assignee.firstName} ${task.assignee.lastName}`, emailSubject, emailHtml)
          } catch (emailErr) {
            console.error(`[CRON] Échec de l'envoi d'e-mail pour la tâche ${task.id} :`, emailErr)
          }
        }

        if (task.assignee?.mobilePhone) {
          const { sendBrevoSms } = await import('@/lib/brevo')
          const smsText = `Cabinet : Votre tache "${task.title.substring(0, 50)}" arrive a echeance demain.`
          try {
            await sendBrevoSms(task.assignee.mobilePhone, smsText)
          } catch (smsErr) {
            console.error(`[CRON] Échec de l'envoi de SMS pour la tâche ${task.id} :`, smsErr)
          }
        }
      }
    }

    // 3. Courriers en retard
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

    // 4. Courriers à valider (validationStatus === 'A_VALIDER')
    const pendingValidationMails = await prisma.mailCase.findMany({
      where: {
        validationStatus: 'A_VALIDER'
      }
    })

    for (const mail of pendingValidationMails) {
      const targets = mail.assigneeId ? [mail.assigneeId, ...validatorIds] : validatorIds
      const uniqueTargets = Array.from(new Set(targets))
      
      for (const uid of uniqueTargets) {
        const existing = await prisma.notification.findFirst({
          where: { userId: uid, relatedId: mail.id, type: 'MAIL_PENDING_VALIDATION', readAt: null }
        })
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: 'MAIL_PENDING_VALIDATION',
              title: 'Courrier à valider',
              message: `Le courrier "${mail.subject}" est en attente de validation.`,
              relatedType: 'MailCase',
              relatedId: mail.id,
              severity: 'WARNING'
            }
          })
        }
      }
    }

    // 5. Documents à valider (status === 'PENDING')
    const pendingDocuments = await prisma.document.findMany({
      where: {
        status: 'PENDING',
        archivedAt: null
      }
    })

    for (const doc of pendingDocuments) {
      for (const uid of validatorIds) {
        const existing = await prisma.notification.findFirst({
          where: { userId: uid, relatedId: doc.id, type: 'DOCUMENT_PENDING_VALIDATION', readAt: null }
        })
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: 'DOCUMENT_PENDING_VALIDATION',
              title: 'Document à valider',
              message: `Le document "${doc.title}" est en attente de validation.`,
              relatedType: 'Document',
              relatedId: doc.id,
              severity: 'WARNING'
            }
          })
        }
      }
    }

    // 6. Fiches & Discours / QE à valider ou rédiger (status in ['A_REDIGER', 'A_VALIDER'])
    const pendingQEs = await prisma.writtenQuestion.findMany({
      where: {
        status: { in: ['A_REDIGER', 'A_VALIDER'] },
        archivedAt: null
      }
    })

    for (const qe of pendingQEs) {
      const targets = qe.assigneeId ? [qe.assigneeId, ...validatorIds] : validatorIds
      const uniqueTargets = Array.from(new Set(targets))
      
      for (const uid of uniqueTargets) {
        const existing = await prisma.notification.findFirst({
          where: { userId: uid, relatedId: qe.id, type: 'QE_PENDING_VALIDATION', readAt: null }
        })
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: 'QE_PENDING_VALIDATION',
              title: 'Fiche / Discours / QE à valider',
              message: `La fiche / question "${qe.title}" (${qe.status === 'A_REDIGER' ? 'à rédiger' : 'à valider'}) nécessite votre attention.`,
              relatedType: 'WrittenQuestion',
              relatedId: qe.id,
              severity: 'WARNING'
            }
          })
        }
      }
    }

    // 7. Planning & Demandes de congés à venir
    const upcomingLeaves = await prisma.employeeStatus.findMany({
      where: {
        dayType: { in: ['paid_leave', 'half_paid_leave'] },
        date: { gte: today }
      },
      include: {
        employee: true
      }
    })

    for (const leave of upcomingLeaves) {
      for (const uid of validatorIds) {
        if (uid === leave.employeeId) continue // Ne pas notifier soi-même de son propre congé
        const leaveKey = `${leave.employeeId}-${leave.date.toISOString().split('T')[0]}`
        const existing = await prisma.notification.findFirst({
          where: { userId: uid, relatedId: leaveKey, type: 'PLANNING_CONGE', readAt: null }
        })
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: 'PLANNING_CONGE',
              title: 'Planning : Demande de congé',
              message: `${leave.employee.name} a posé un congé pour le ${new Date(leave.date).toLocaleDateString('fr-FR')}.`,
              relatedType: 'Planning',
              relatedId: leaveKey,
              severity: 'INFO'
            }
          })
        }
      }
    }

    // 8. QE en retard (> 60 jours sans réponse)
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

    return NextResponse.json({ 
      success: true, 
      overdueCount: overdueTasks.length, 
      dueTomorrowCount: dueTomorrowTasks.length,
      overdueMailsCount: overdueMails.length,
      pendingValidationMailsCount: pendingValidationMails.length,
      pendingDocumentsCount: pendingDocuments.length,
      pendingQEsCount: pendingQEs.length,
      upcomingLeavesCount: upcomingLeaves.length
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erreur lors de la génération des notifications' }, { status: 500 })
  }
}
