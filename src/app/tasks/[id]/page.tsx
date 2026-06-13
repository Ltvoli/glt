import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditTaskForm from './edit-task-form'
import SubtasksList from './subtasks-list'
import TaskComments from './task-comments'
import TaskAttachments from './task-attachments'

import PrintButton from '@/components/PrintButton'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const task = await prisma.task.findUnique({
    where: { id },
    include: { 
      assignee: true,
      subtasks: true,
      documents: true,
      comments: { orderBy: { createdAt: 'desc' } },
      tags: { include: { tag: true } }
    }
  })

  if (!task) {
    notFound()
  }

  const users = await prisma.user.findMany()
  const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }} className="hide-on-print">
        <Link href="/tasks" className="button outline">Retour</Link>
        <PrintButton />
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
          {task.title}
        </h1>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          backgroundColor: '#eff6ff', 
          color: 'var(--primary)', 
          borderRadius: '9999px', 
          fontSize: '0.875rem', 
          fontWeight: 500,
          marginLeft: 'auto'
        }}>
          {task.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Détails de la tâche</h2>
            <EditTaskForm task={task} users={users} allTags={allTags} dictionary={dictionary} />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Sous-tâches</h2>
            <SubtasksList taskId={task.id} initialSubtasks={task.subtasks} />
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
