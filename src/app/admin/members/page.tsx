import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import MembersClient from './members-client'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/auth/unauthorized')
  }

  // Fetch active users (exclude archived)
  const users = await prisma.user.findMany({
    where: { archivedAt: null },
    orderBy: { lastName: 'asc' }
  })

  // Fetch pending invitations (exclude accepted)
  const invitations = await prisma.invitation.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  // Fetch all system permissions
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { key: 'asc' }
    ]
  })

  // Fetch all role permission links
  const rolePermissions = await prisma.rolePermission.findMany()

  // Format Date fields to ISO strings or Date objects for Client Component serialization
  // Next.js handles Date objects in Server Actions/Components serialization properly,
  // but we can map them to ensure proper types.
  const serializedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isActive: u.isActive,
    suspendedAt: u.suspendedAt,
    lastLoginAt: u.lastLoginAt,
    lastLoginIp: u.lastLoginIp
  }))

  const serializedInvitations = invitations.map(i => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt
  }))

  const serializedPermissions = permissions.map(p => ({
    id: p.id,
    key: p.key,
    label: p.label || '',
    module: p.module
  }))

  const serializedRolePermissions = rolePermissions.map(rp => ({
    role: rp.role,
    permissionId: rp.permissionId
  }))

  return (
    <div>
      <MembersClient
        currentUserId={session.userId}
        currentUserRole={session.dbRole}
        users={serializedUsers}
        invitations={serializedInvitations}
        permissions={serializedPermissions}
        rolePermissions={serializedRolePermissions}
      />
    </div>
  )
}
