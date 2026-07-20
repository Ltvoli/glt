import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QEForm from './qe-form'

export default async function NewQEPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const users = await prisma.user.findMany({
    where: { isActive: true, archivedAt: null },
    select: { id: true, name: true }
  })
  const contacts = await prisma.contact.findMany({ 
    where: { archivedAt: null },
    select: { id: true, firstName: true, lastName: true, usageName: true }
  })
  const tasks = await prisma.task.findMany({
    where: { status: { notIn: ['TERMINEE', 'ANNULEE'] } },
    select: { id: true, title: true }
  })
  const mails = await prisma.mailCase.findMany({
    where: { status: { notIn: ['CLASSE'] } },
    select: { id: true, subject: true, reference: true }
  })
  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })
  const { getModuleFields } = await import('@/lib/fields')
  const fieldConfig = await getModuleFields('writtenquestions')

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/qe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux questions écrites
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouvelle Question Écrite</h1>
      </div>

      <div className="card">
        <QEForm users={JSON.parse(JSON.stringify(users))} contacts={JSON.parse(JSON.stringify(contacts))} tasks={JSON.parse(JSON.stringify(tasks))} mails={JSON.parse(JSON.stringify(mails))} dictionary={JSON.parse(JSON.stringify(dictionary))} fieldConfig={fieldConfig} />
      </div>
    </div>
  )
}
