import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TagsClient from './tags-client'

export default async function AdminTagsPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/auth/unauthorized')
  }

  // Fetch tags along with contact and task counts
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          contacts: true,
          tasks: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Map to matching client structure
  const mappedTags = tags.map(t => ({
    id: t.id,
    name: t.name,
    color: t.color,
    usageCount: t.usageCount,
    contactsCount: t._count.contacts,
    tasksCount: t._count.tasks
  }))

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Gestion des Tags
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          Créez, modifiez ou supprimez les tags utilisés pour organiser vos contacts et vos tâches.
        </p>
      </div>

      <TagsClient
        currentUserRole={session.dbRole}
        tags={mappedTags}
      />
    </div>
  )
}
