import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SecurityClient from './security-client'

export default async function SettingsSecurityPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  const [user, rawSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        twoFactorEnabled: true
      }
    }),
    prisma.userSession.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ])

  const userSessions = rawSessions.map(s => ({
    id: s.id,
    createdAt: s.createdAt,
    ip: s.ipAddress,
    userAgent: s.userAgent
  }))

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <SecurityClient
        twoFactorEnabled={user.twoFactorEnabled}
        currentSessionId={session.jti}
        initialSessions={userSessions}
      />
    </div>
  )
}
