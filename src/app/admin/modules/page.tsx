import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ModuleList from './module-list'

export default async function AdminModulesPage() {
  const session = await getSession()
  if (session?.role !== 'SUPERADMIN') {
    redirect('/admin')
  }

  const modules = await prisma.module.findMany({
    orderBy: { createdAt: 'asc' }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-color)]">Gestion des Modules</h1>
        <p className="text-gray-500 mt-2">Activez ou désactivez les fonctionnalités globales de la plateforme.</p>
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl p-6 border border-[var(--border-color)]">
        <ModuleList initialModules={modules} />
      </div>
    </div>
  )
}
