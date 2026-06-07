import type { Metadata } from 'next'
import './globals.css'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

import { Inter } from 'next/font/google'

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
  
  if (session) {
    userRole = session.role as string
    activeModules = session.activeModules || []
  }

  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.variable}>
        {session ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar userRole={userRole} activeModules={activeModules} />
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
