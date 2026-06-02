import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Bureau Parlementaire',
  description: 'Gestion du bureau parlementaire',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <html lang="fr">
      <body>
        {session ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', marginLeft: '250px' }}>
              {children}
            </main>
          </div>
        ) : (
          <main>
            {children}
          </main>
        )}
      </body>
    </html>
  )
}
