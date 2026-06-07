'use client'

import { useActionState } from 'react'
import { createUser } from '../actions'
import { Role } from '@prisma/client'
import { useState } from 'react'

const initialState = { success: false, error: '' }

export default function UserForm({ currentUserRole }: { currentUserRole: Role }) {
  const [state, formAction, isPending] = useActionState(createUser, initialState)
  const [showPass, setShowPass] = useState(false)

  const roles = Object.values(Role)

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom complet</label>
          <input 
            type="text" 
            name="name" 
            required 
            className="w-full px-3 py-2 border rounded-md" 
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            name="email" 
            required 
            className="w-full px-3 py-2 border rounded-md" 
            placeholder="jean@cdc.app"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rôle</label>
          <select name="role" required className="w-full px-3 py-2 border rounded-md">
            {roles.map(r => (
              <option 
                key={r} 
                value={r} 
                disabled={r === 'SUPERADMIN' && currentUserRole !== 'SUPERADMIN'}
              >
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <div className="relative">
            <input 
              type={showPass ? "text" : "password"} 
              name="password" 
              required 
              className="w-full px-3 py-2 border rounded-md pr-10" 
              placeholder="Minimum 12 caractères..."
            />
            <button 
              type="button" 
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              {showPass ? 'Cacher' : 'Voir'}
            </button>
          </div>
        </div>
      </div>
      
      {state?.error && (
        <div className="text-red-600 text-sm">{state.error}</div>
      )}
      {state?.success && (
        <div className="text-green-600 text-sm">Utilisateur créé avec succès.</div>
      )}

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isPending ? 'Création...' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  )
}
