import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Shield, FileText, Clock, Database, UserX, Lock } from 'lucide-react'

export default async function RgpdPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={28} color="var(--primary)" /> Conformité RGPD & Sécurité
      </h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Registre Simplifié des Traitements
        </h2>
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Ce registre recense les données à caractère personnel traitées au sein de l'application.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Catégorie de données</th>
              <th>Finalité</th>
              <th>Accès</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contacts (Noms, Emails, Téléphones, Adresses)</td>
              <td>Gestion des relations publiques, envois de courriers</td>
              <td>Tous les utilisateurs authentifiés</td>
            </tr>
            <tr>
              <td>Salariés / Utilisateurs</td>
              <td>Gestion du planning, assignation de tâches</td>
              <td>Administrateurs (Édition), Utilisateurs (Consultation)</td>
            </tr>
            <tr>
              <td>Fichiers Joints</td>
              <td>Pièces justificatives des courriers/tâches</td>
              <td>Tous les utilisateurs authentifiés</td>
            </tr>
            <tr>
              <td>Logs d'audit</td>
              <td>Traçabilité et sécurité (qui a fait quoi)</td>
              <td>Administrateurs</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Politique de Conservation
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Conformément à nos obligations légales et à notre politique interne, les données personnelles sont conservées <strong>jusqu'à 5 ans après la fin du mandat</strong> ou la fin de la relation avec le contact. Passé ce délai, ou sur demande explicite, les données sont pseudonymisées ou purgées.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserX size={20} /> Droit à l'Oubli et Pseudonymisation
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          L'application applique un principe de <strong>pseudonymisation</strong> lors de la suppression d'un compte utilisateur. Au lieu d'effacer physiquement l'enregistrement en base (ce qui briserait l'historique des actions et courriers), le compte est transformé : ses informations identifiantes (email) sont altérées, et ses droits d'accès sont révoqués de façon permanente (rôle READONLY).
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={20} /> Sécurité Applicative
        </h2>
        <ul style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '1.5rem', margin: 0 }}>
          <li>Mot de passe hashé avec l'algorithme <strong>bcrypt (Cost 12)</strong>.</li>
          <li>Sessions sécurisées via JWT et cookies `HttpOnly`, `SameSite=Strict`.</li>
          <li>Filtres anti Path-Traversal lors de l'upload de fichiers.</li>
          <li>Blocage systématique des fichiers exécutables (.exe, .sh, .bat).</li>
          <li>Principe du moindre privilège appliqué via le middleware de session (`requireWriteAccess`).</li>
        </ul>
      </div>
    </div>
  )
}
