import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditTaskForm from './edit-task-form'
import SubtasksList from './subtasks-list'
import TaskComments from './task-comments'
import TaskAttachments from './task-attachments'
import NudgeButton from './nudge-button'
import { getSession } from '@/lib/session'

import PrintButton from '@/components/PrintButton'

import TaskValidationCard from './task-validation-card'

// Helper to translate and format audit logs
function getAuditText(log: any) {
  const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'
  const dateStr = new Date(log.createdAt).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let title = ''
  let detailsText = ''

  if (log.action === 'CREATE') {
    title = 'Tâche créée'
    const statusVal = log.details?.status || 'A_FAIRE'
    const priorityVal = log.details?.priority || 'NORMALE'
    detailsText = `Création initiale de la tâche (Statut: "${statusVal}", Priorité: "${priorityVal}").`
  } else if (log.action === 'UPDATE_STATUS') {
    title = 'Changement de statut'
    const oldStatus = log.details?.oldStatus || 'inconnu'
    const newStatus = log.details?.newStatus || 'inconnu'
    detailsText = `Statut modifié : "${oldStatus}" ➔ "${newStatus}".`
  } else if (log.action === 'UPDATE') {
    title = 'Détails mis à jour'
    detailsText = 'Les informations ou paramètres de la tâche ont été mis à jour.'
  } else if (log.action === 'ADD_SUBTASK') {
    title = 'Sous-tâche créée'
    detailsText = `Ajout de la sous-tâche "${log.details?.title}".`
  } else if (log.action === 'TOGGLE_SUBTASK') {
    title = 'Sous-tâche mise à jour'
    const statusText = log.details?.isCompleted ? 'terminée' : 'à faire'
    detailsText = `La sous-tâche "${log.details?.title}" a été marquée comme ${statusText}.`
  } else if (log.action === 'DELETE_SUBTASK') {
    title = 'Sous-tâche supprimée'
    detailsText = `La sous-tâche "${log.details?.title}" a été supprimée.`
  } else if (log.action === 'NUDGE') {
    title = 'Relance envoyée'
    detailsText = `Le responsable a été relancé.`
  } else {
    title = log.action
    detailsText = log.details ? JSON.stringify(log.details) : ''
  }

  return { title, dateStr, userName, detailsText }
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const [task, auditLogs, activeMails, activeQes] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: { 
        assignee: true,
        validator: true,
        validatedBy: true,
        subtasks: true,
        documents: true,
        links: true,
        comments: { 
          orderBy: { createdAt: 'desc' },
          include: { author: true }
        },
        tags: { include: { tag: true } }
      }
    }),
    prisma.auditLog.findMany({
      where: { entity: 'Task', entityId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } }
    }),
    prisma.mailCase.findMany({
      select: { id: true, reference: true, subject: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.writtenQuestion.findMany({
      where: { archivedAt: null },
      select: { id: true, anNumber: true, title: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ])

  if (!task) {
    notFound()
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, archivedAt: null }
  })
  const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })
  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('tasks')

  const session = await getSession()
  const canDelete = session && (session.dbRole === 'ADMINISTRATEUR' || session.dbRole === 'SUPERVISEUR')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }} className="hide-on-print">
        <Link href="/tasks" className="button outline">Retour</Link>
        <PrintButton />
        {task.assigneeId && <NudgeButton taskId={task.id} />}
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
          {task.title}
        </h1>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          backgroundColor: task.status === 'A_VALIDER' ? '#fef3c7' : '#eff6ff', 
          color: task.status === 'A_VALIDER' ? '#92400e' : 'var(--primary)', 
          borderRadius: '9999px', 
          fontSize: '0.875rem', 
          fontWeight: 500,
          marginLeft: 'auto'
        }}>
          {task.status === 'A_VALIDER' ? 'À valider par Lionel Tivoli' : task.status}
        </span>
      </div>

      <TaskValidationCard 
        task={JSON.parse(JSON.stringify(task))} 
        currentUserId={session?.userId || ''} 
        userRole={session?.dbRole || ''} 
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Détails de la tâche</h2>
            <EditTaskForm 
              task={JSON.parse(JSON.stringify(task))} 
              users={JSON.parse(JSON.stringify(users))} 
              mails={JSON.parse(JSON.stringify(activeMails))}
              qes={JSON.parse(JSON.stringify(activeQes))}
              allTags={allTags} 
              dictionary={dictionary} 
              fieldConfig={fieldConfig} 
              canDelete={!!canDelete} 
            />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Sous-tâches</h2>
            <SubtasksList taskId={task.id} initialSubtasks={JSON.parse(JSON.stringify(task.subtasks))} />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Historique & Traçabilité</h2>
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun historique disponible pour cette tâche.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1.25rem', marginLeft: '0.5rem', marginTop: '0.5rem' }}>
                {auditLogs.map((log: any) => {
                  const { title, dateStr, userName, detailsText } = getAuditText(log)
                  return (
                    <div key={log.id} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: '-1.625rem',
                        top: '0.25rem',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: log.action === 'CREATE' ? '#10b981' : log.action === 'UPDATE_STATUS' ? 'var(--primary)' : '#94a3b8',
                        border: '2px solid white'
                      }}></div>
                      
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Par {userName} le {dateStr}
                      </div>
                      {detailsText && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          {detailsText}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Pièces jointes</h2>
            <TaskAttachments taskId={task.id} initialAttachments={task.documents} />
          </div>
          
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Commentaires</h2>
            <TaskComments taskId={task.id} initialComments={task.comments} />
          </div>
        </div>
      </div>
    </div>
  )
}
