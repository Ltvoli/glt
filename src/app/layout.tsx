import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import Omnisearch from '@/components/Omnisearch'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
  let activeModules: string[] = []
  let userName = ''
  let unreadCount = 0

  if (session) {
    userRole = session.role as string
    activeModules = session.activeModules || []

    // Fetch user info and unread notifications count in parallel
    const [user, notifCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true, avatarUrl: true },
      }),
      prisma.notification.count({
        where: { userId: session.userId, readAt: null },
      }),
    ])

    if (user) userName = `${user.firstName} ${user.lastName}`
    unreadCount = notifCount
  }

  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.variable}>
        {session ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar
              userRole={userRole}
              activeModules={activeModules}
            />
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
        {session && <Omnisearch />}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}

