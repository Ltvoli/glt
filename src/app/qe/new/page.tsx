import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import QEForm from './qe-form'

export default async function NewQEPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

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
        <Link href="/qe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux questions écrites
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouvelle Question Écrite</h1>
      </div>

      <div className="card">
        <QEForm users={users} contacts={contacts} tasks={tasks} />
      </div>
    </div>
  )
}
