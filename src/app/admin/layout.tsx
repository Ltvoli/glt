import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AdminNav from './admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/auth/unauthorized')
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Administration
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Gérez votre espace de travail, les membres de votre bureau, les intégrations et les règles métier.
        </p>
      </header>

      {/* Horizontal Tab Navigation */}
      <AdminNav dbRole={session.dbRole} />

      {/* Tab Page Contents */}
      <main>
        {children}
      </main>
    </div>
  )
}
