import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TagList from './tag-list'

export default async function TagsSettingsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  // Fetch all tags with counts
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { contacts: true, tasks: true }
      }
    }
  })

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Gestion des Tags</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gérez les étiquettes utilisées pour classer vos contacts et vos tâches.</p>
        </div>
      </div>

      <div className="card">
        <TagList initialTags={tags} />
      </div>
    </div>
  )
}
