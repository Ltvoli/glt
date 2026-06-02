import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MailForm from './mail-form'

export default async function NewMailPage({ searchParams }: { searchParams: Promise<{ parentMailCaseId?: string, subject?: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { parentMailCaseId, subject } = await searchParams

  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const contacts = await prisma.contact.findMany({ 
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true }
  })
  const tasks = await prisma.task.findMany({
    where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } },
    select: { id: true, title: true }
  })

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
          users={users} 
          contacts={contacts} 
          tasks={tasks} 
          initialParentId={parentMailCaseId}
          initialSubject={subject}
        />
      </div>
    </div>
  )
}
