import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PrivacyClient from './privacy-client'

export default async function SettingsPrivacyPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true
    }
  })

  if (!user) {
    redirect('/login')
  }

  const userName = `${user.firstName} ${user.lastName}`

  return (
    <div>
      <PrivacyClient
        userEmail={user.email}
        userName={userName}
      />
    </div>
  )
}
