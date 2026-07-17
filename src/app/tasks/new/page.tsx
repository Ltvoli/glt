import TaskForm from './task-form'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string, mailCaseId?: string, questionId?: string }>
}) {
  const users = await prisma.user.findMany({
    where: { isActive: true, archivedAt: null }
  })
  const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  const { contactId, mailCaseId, questionId } = await searchParams
  
  const [activeMails, activeQes] = await Promise.all([
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

  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })
  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('tasks')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/tasks" className="button outline">Retour</Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouvelle Tâche</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <TaskForm 
          users={JSON.parse(JSON.stringify(users))} 
          contactId={contactId} 
          mailCaseId={mailCaseId}
          questionId={questionId}
          mails={JSON.parse(JSON.stringify(activeMails))}
          qes={JSON.parse(JSON.stringify(activeQes))}
          allTags={allTags} 
          dictionary={JSON.parse(JSON.stringify(dictionary))} 
          fieldConfig={fieldConfig} 
        />
      </div>
    </div>
  )
}
