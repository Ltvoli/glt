import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SettingsNav from './settings-nav'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Paramètres du compte
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Gérez vos informations personnelles, vos préférences d'affichage, la sécurité de vos accès et vos données privées.
        </p>
      </header>

      {/* Personal Settings Tabs */}
      <SettingsNav />

      {/* Page Contents */}
      <main>
        {children}
      </main>
    </div>
  )
}
