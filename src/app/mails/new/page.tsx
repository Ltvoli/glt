import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MailForm from './mail-form'

export default async function NewMailPage({ searchParams }: { searchParams: Promise<{ parentMailCaseId?: string, subject?: string, contactId?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { parentMailCaseId, subject, contactId } = await searchParams

  const users = await prisma.user.findMany({
    where: { isActive: true, archivedAt: null },
    select: { id: true, name: true }
  })
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/mails" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux courriers
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouveau Courrier</h1>
      </div>

      <div className="card">
        <MailForm 
          users={JSON.parse(JSON.stringify(users))} 
          contacts={JSON.parse(JSON.stringify(contacts))} 
          tasks={JSON.parse(JSON.stringify(tasks))} 
          initialParentId={parentMailCaseId}
          initialSubject={subject}
          initialContactId={contactId}
          dictionary={JSON.parse(JSON.stringify(dictionary))}
          fieldConfig={fieldConfig}
        />
      </div>
    </div>
  )
}
