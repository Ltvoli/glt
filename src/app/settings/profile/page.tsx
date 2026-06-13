import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function SettingsProfilePage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true
    }
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <ProfileClient user={user} />
    </div>
  )
}
