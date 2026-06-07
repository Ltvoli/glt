import { requireSettingsAccess } from '@/lib/settings-auth'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSettingsAccess()

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Paramètres</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Gestion globale du SaaS, de l'administration et de la sécurité.
        </p>
      </header>
      <main>
        {children}
      </main>
    </div>
  )
}
