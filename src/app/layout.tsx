import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import Omnisearch from '@/components/Omnisearch'
import { Lexend, Source_Sans_3 } from 'next/font/google'
import { Toaster } from 'sonner'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-source-sans' })

export const metadata: Metadata = {
  title: 'BP-Lionel Tivoli',
  description: 'Gestion du BP-Lionel Tivoli',
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
  let lateMailCount = 0

  if (session) {
    userRole = session.dbRole as string
    activeModules = session.activeModules || []

    // Fetch user info, unread notifications, and late mails in parallel
    const [user, notifCount, lateMails] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true, avatarUrl: true },
      }),
      prisma.notification.count({
        where: { userId: session.userId, readAt: null },
      }),
      prisma.mailCase.count({
        where: {
          responseDueDate: { lt: new Date() },
          status: { notIn: ['REPONDU', 'CLASSE'] }
        }
      })
    ])

    if (user) userName = `${user.firstName} ${user.lastName}`
    unreadCount = notifCount
    lateMailCount = lateMails
  }

  return (
    <html lang="fr" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className={`${lexend.variable} ${sourceSans.variable}`}>
        {session ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar
              userRole={userRole}
              activeModules={activeModules}
              unreadCount={unreadCount}
              lateMailCount={lateMailCount}
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

