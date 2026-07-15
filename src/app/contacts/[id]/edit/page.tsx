import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditContactForm from '../edit-contact-form'
import { getModuleFields } from '@/lib/fields'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id, archivedAt: null },
    include: {
      tags: { include: { tag: true } },
    }
  })

  if (!contact) notFound()

  const [allTags, supportLevels, dictionary, fieldConfig] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.supportLevel.findMany({ orderBy: { order: 'asc' } }),
    prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    getModuleFields('contacts')
  ])

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/contacts/${contact.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour au contact
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Modifier le contact</h1>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <EditContactForm
          contact={JSON.parse(JSON.stringify(contact))}
          allTags={allTags}
          dictionary={dictionary}
          fieldConfig={fieldConfig}
          supportLevels={supportLevels}
        />
      </div>
    </div>
  )
}
