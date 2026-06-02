import prisma from '@/lib/prisma'
import { createUser, updateUserRole, resetUserPassword, deleteUser } from '../actions'

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Gestion des Utilisateurs</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Administration des comptes d'accès à la plateforme.</p>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Ajouter un Utilisateur</h2>
        <form action={async (formData) => {
          'use server'
          const name = formData.get('name') as string
          const email = formData.get('email') as string
          const role = formData.get('role') as string
          const passwordHash = formData.get('password') as string
          if (name && email && role && passwordHash) {
            await createUser({ name, email, role, passwordHash })
          }
        }} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Nom</label>
            <input type="text" name="name" className="form-control" required />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Email</label>
            <input type="email" name="email" className="form-control" required />
          </div>
          <div className="form-group" style={{ width: '150px' }}>
            <label>Rôle</label>
            <select name="role" className="form-control" required defaultValue="USER">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
              <option value="READONLY">READONLY</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Mot de passe</label>
            <input type="password" name="password" className="form-control" required />
          </div>
          <button type="submit" className="button primary" style={{ marginBottom: '1rem' }}>Créer</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Liste des Utilisateurs</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem' }}>Nom</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Rôle</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{u.name}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <form action={async (formData) => {
                      'use server'
                      await updateUserRole(u.id, formData.get('role') as string)
                    }}>
                      <select name="role" defaultValue={u.role} onChange={(e) => e.target.form?.submit()} className="form-control" style={{ padding: '0.25rem', margin: 0 }}>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPERADMIN">SUPERADMIN</option>
                        <option value="READONLY">READONLY</option>
                      </select>
                    </form>
                  </td>
                  <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <form action={async () => {
                      'use server'
                      // Quick reset to "password123"
                      await resetUserPassword(u.id, 'password123')
                    }}>
                      <button type="submit" className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Reset à password123">Reset MDP</button>
                    </form>
                    
                    <form action={async () => {
                      'use server'
                      await deleteUser(u.id)
                    }}>
                      <button type="submit" className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={u.role === 'SUPERADMIN'}>
                        Archiver
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
