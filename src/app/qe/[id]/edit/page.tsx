import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import EditQEForm from './edit-qe-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditQEPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const qe = await prisma.writtenQuestion.findUnique({
    where: { id }
  })

  if (!qe) redirect('/qe')

  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/qe/${qe.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour à la question
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Modifier la question</h1>
      </div>

      <div className="card">
        <EditQEForm qe={qe} users={users} dictionary={dictionary} />
      </div>
    </div>
  )
}
