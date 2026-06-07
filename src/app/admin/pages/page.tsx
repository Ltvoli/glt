import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PageList from './page-list'

export default async function AdminPagesPage() {
  const session = await getSession()
  if (session?.role !== 'SUPERADMIN') {
    redirect('/admin')
  }

  const pages = await prisma.page.findMany({
    orderBy: { order: 'asc' },
    include: {
      module: true
    }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-color)]">Gestion des Pages</h1>
        <p className="text-gray-500 mt-2">Réorganisez les pages de la plateforme et gérez leur visibilité.</p>
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl p-6 border border-[var(--border-color)]">
        <PageList initialPages={pages} />
      </div>
    </div>
  )
}
