import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import IntegrationsClient from './integrations-client'

export default async function AdminIntegrationsPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  // Strictly only ADMINISTRATEUR allowed on Integrations & API tab
  if (session.dbRole !== 'ADMINISTRATEUR') {
    redirect('/admin')
  }

  const [users, apiKeys, webhooks] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      orderBy: { firstName: 'asc' }
    }),
    prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' }
    }),
    prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' }
    })
  ])

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Intégrations & API
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          Générez des clés API pour connecter des services tiers, configurez des webhooks pour recevoir des notifications d'événements, et consultez les journaux d'audit d'activité.
        </p>
      </div>

      <IntegrationsClient
        users={users}
        initialKeys={apiKeys}
        initialWebhooks={webhooks}
      />
    </div>
  )
}
