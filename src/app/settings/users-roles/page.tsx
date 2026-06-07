import { requireSettingsAccess } from '@/lib/settings-auth'
import { getUsers } from './user-actions'
import UserRoleEditor from './UserRoleEditor'

export default async function SettingsUsersPage() {
  const session = await requireSettingsAccess()
  
  const users = await getUsers()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Utilisateurs & Rôles</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez les niveaux d'accès des membres de votre équipe. <br/>
          <strong>Super Admin</strong> : Accès total, y compris aux réglages techniques.<br/>
          <strong>Admin</strong> : Accès aux paramètres métiers (listes, tags, courriers).<br/>
          <strong>Collaborateur</strong> : Accès standard en écriture (contacts, tâches).<br/>
          <strong>Lecture seule</strong> : Consultation uniquement (pas de modification, pas de paramétrages).
        </p>
      </div>

      <UserRoleEditor users={users} currentUserId={session.userId} />
    </div>
  )
}
