import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Role } from '@prisma/client'
import UserForm from './user-form'
import UserTable from './user-table'

export default async function AdminUsersPage() {
  const session = await getSession()
  const currentUserRole = session?.role as Role

  const users = await prisma.user.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-color)]">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 mt-2">Administration des comptes d'accès à la plateforme et de leurs rôles.</p>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl p-6 mb-8 border border-[var(--border-color)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Ajouter un Utilisateur</h2>
        <UserForm currentUserRole={currentUserRole} />
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl p-6 border border-[var(--border-color)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--text-color)]">Utilisateurs Actifs</h2>
        <UserTable users={users} currentUserRole={currentUserRole} />
      </div>
    </div>
  )
}
