import { requireSettingsAccess } from '@/lib/settings-auth'

export default async function SettingsPage() {
  await requireSettingsAccess()
  return (
    <div className="card">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>En cours de construction</h2>
      <p style={{ color: 'var(--text-muted)' }}>Cette sous-section de paramètres (tasks) sera implémentée prochainement.</p>
    </div>
  )
}
