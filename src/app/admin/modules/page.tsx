import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ModulesClient from './modules-client'

export default async function AdminModulesPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  // Guard access: only ADMINISTRATEUR or SUPERVISEUR
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/auth/unauthorized')
  }

  const [modules, pages, settings, permissions] = await Promise.all([
    prisma.module.findMany({
      orderBy: { order: 'asc' }
    }),
    prisma.page.findMany({
      where: { archivedAt: null },
      orderBy: { order: 'asc' }
    }),
    prisma.setting.findMany({
      orderBy: { key: 'asc' }
    }),
    prisma.permission.findMany({
      select: { key: true },
      orderBy: { key: 'asc' }
    })
  ])

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Modules, Pages & Paramètres
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          Configurez l'activation des modules CRM, réorganisez les pages de navigation et modifiez les paramètres système généraux.
        </p>
      </div>

      <ModulesClient
        currentUserRole={session.dbRole}
        modules={modules}
        pages={pages}
        settings={settings}
        permissions={permissions}
      />
    </div>
  )
}
