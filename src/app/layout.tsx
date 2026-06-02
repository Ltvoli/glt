import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Bureau Parlementaire',
  description: 'Gestion du bureau parlementaire',
}

import prisma from '@/lib/prisma'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  let userRole = 'USER'
  
  if (session?.userId) {
    const u = await prisma.user.findUnique({ where: { id: session.userId } })
    if (u) userRole = u.role
  }

  return (
    <html lang="fr">
      <body>
        {session ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar userRole={userRole} />
            <main style={{ flex: 1, padding: '2rem', marginLeft: '250px' }} className="main-content">
              <TopBar />
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
