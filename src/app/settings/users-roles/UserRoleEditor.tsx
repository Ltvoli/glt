'use client'

import { useState, useActionState } from 'react'
import { updateUserRole } from './user-actions'
import { Shield, ShieldAlert, User, Eye, Check } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function UserRoleEditor({ users, currentUserId }: { users: any[], currentUserId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="card">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {u.name} {u.id === currentUserId && <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Vous</span>}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {editingId === u.id ? (
                <EditRoleForm user={u} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <RoleBadge role={u.role} />
                  {u.id !== currentUserId && (
                    <button onClick={() => setEditingId(u.id)} className="button-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                      Modifier le rôle
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'SUPERADMIN': return <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#9333ea', fontSize: '0.875rem', fontWeight: 600 }}><ShieldAlert size={16} /> Super Admin</span>
    case 'ADMIN': return <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ea580c', fontSize: '0.875rem', fontWeight: 600 }}><Shield size={16} /> Admin</span>
    case 'USER': return <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500 }}><User size={16} /> Collaborateur</span>
    case 'READONLY': return <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}><Eye size={16} /> Lecture seule</span>
    default: return <span>{role}</span>
  }
}

function EditRoleForm({ user, onCancel }: { user: any, onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState(updateUserRole, initialState)

  return (
    <form action={formAction} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input type="hidden" name="userId" value={user.id} />
      <select name="role" className="form-control" defaultValue={user.role} style={{ padding: '0.25rem 0.5rem', height: '32px', fontSize: '0.875rem' }}>
        <option value="SUPERADMIN">Super Admin</option>
        <option value="ADMIN">Admin</option>
        <option value="USER">Collaborateur standard</option>
        <option value="READONLY">Lecture seule</option>
      </select>
      <button type="submit" className="button-icon" style={{ color: 'var(--success)' }} disabled={isPending}>
        <Check size={18} />
      </button>
      <button type="button" onClick={onCancel} className="button-icon" style={{ color: 'var(--text-muted)' }}>
        Annuler
      </button>
      {state.error && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', position: 'absolute', marginTop: '2rem' }}>{state.error}</span>}
    </form>
  )
}
