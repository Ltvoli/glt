import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditMailForm from './edit-mail-form'

import { isWorkflowTaskTitle } from '@/lib/mail-utils'

export default async function EditMailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const mail = await prisma.mailCase.findUnique({
    where: { id }
  })

  if (!mail) redirect('/mails')

  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const contacts = await prisma.contact.findMany({ 
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true }
  })
  const tasks = await prisma.task.findMany({
    where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } },
    select: { id: true, title: true }
  })
  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })
  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('mailcases')

  // Find currently linked contact/task if any
  const linkedContact = await prisma.globalLink.findFirst({
    where: { mailCaseId: mail.id, contactId: { not: null } },
    select: { contactId: true }
  })

  const allLinkedTasks = await prisma.globalLink.findMany({
    where: { mailCaseId: mail.id, taskId: { not: null } },
    include: { task: { select: { title: true } } }
  })
  const manualLinkedTask = allLinkedTasks.find(link => link.task && !isWorkflowTaskTitle(link.task.title, mail.reference))
  const initialTaskId = manualLinkedTask?.taskId || undefined

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/mails/${mail.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour au courrier
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Modifier le Courrier</h1>
      </div>

      <div className="card">
        <EditMailForm 
          mail={JSON.parse(JSON.stringify(mail))} 
          users={JSON.parse(JSON.stringify(users))} 
          contacts={JSON.parse(JSON.stringify(contacts))} 
          tasks={JSON.parse(JSON.stringify(tasks))} 
          initialContactId={linkedContact?.contactId || undefined}
          initialTaskId={initialTaskId}
          dictionary={JSON.parse(JSON.stringify(dictionary))}
          fieldConfig={fieldConfig}
        />
      </div>
    </div>
  )
}
