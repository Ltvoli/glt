import prisma from '@/lib/prisma'
import WorkspaceForm from './workspace-form'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Upsert singleton workspace settings to ensure it exists
  const settings = await prisma.workspaceSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'BP-Lionel Tivoli',
      force2FA: false,
      sessionTimeoutMinutes: 1440,
      mobileAccessEnabled: true
    }
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>
          Paramètres de l'espace de travail
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
          Configurez l'identité visuelle de votre espace de travail, imposez la double authentification pour vos collaborateurs et paramétrez les restrictions de sécurité.
        </p>
      </div>

      <WorkspaceForm initialSettings={settings} />
    </div>
  )
}
