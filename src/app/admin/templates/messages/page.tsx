import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import AdminNav from '../../admin-nav'
import TemplatesClient from './templates-client'
import { getTemplatesAction } from './actions'

export default async function MessageTemplatesAdminPage() {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }

  // Only Admin can manage templates
  if (session.dbRole !== 'ADMINISTRATEUR') {
    redirect('/admin')
  }

  const templates = await getTemplatesAction()

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--foreground)' }}>
          Modèles de messages (Email & SMS)
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          Créez et gérez les modèles de messages disponibles pour les envois groupés. Vous pouvez insérer des variables dynamiques pour personnaliser les messages.
        </p>
      </div>

      <AdminNav dbRole={session.dbRole} />

      <TemplatesClient initialTemplates={JSON.parse(JSON.stringify(templates))} />
    </div>
  )
}
