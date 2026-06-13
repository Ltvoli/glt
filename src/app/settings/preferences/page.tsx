import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PreferencesClient from './preferences-client'

export default async function SettingsPreferencesPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      locale: true,
      timezone: true,
      theme: true
    }
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <PreferencesClient user={user} />
    </div>
  )
}
