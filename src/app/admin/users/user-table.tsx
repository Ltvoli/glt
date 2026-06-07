'use client'

import { Role } from '@prisma/client'
import { updateUserRole, archiveUser } from '../actions'
import { useTransition, useState } from 'react'

type UserData = {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
}

export default function UserTable({ users, currentUserRole }: { users: UserData[], currentUserRole: Role }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = (userId: string, newRole: Role) => {
    startTransition(async () => {
      setError(null)
      const res = await updateUserRole(userId, newRole)
      if (res.error) setError(res.error)
    })
  }

  const handleArchive = (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver cet utilisateur ?')) return
    startTransition(async () => {
      setError(null)
      const res = await archiveUser(userId)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div>
      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date création</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(u => {
              const isSuperAdmin = u.role === 'SUPERADMIN'
              const canEdit = !(isSuperAdmin && currentUserRole !== 'SUPERADMIN')

              return (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select 
                      value={u.role}
                      disabled={!canEdit || isPending}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className="border rounded px-2 py-1 bg-transparent disabled:opacity-50"
                    >
                      {Object.values(Role).map(r => (
                        <option 
                          key={r} 
                          value={r} 
                          disabled={r === 'SUPERADMIN' && currentUserRole !== 'SUPERADMIN'}
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleArchive(u.id)}
                      disabled={!canEdit || isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Archiver
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
