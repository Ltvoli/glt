import { requireSettingsAccess } from '@/lib/settings-auth'
import { getIntegrations } from './integration-actions'
import IntegrationEditor from './IntegrationEditor'

export default async function SettingsIntegrationsPage() {
  await requireSettingsAccess()
  
  const integrations = await getIntegrations()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Intégrations & API externes</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Configurez ici les jetons d'accès aux services tiers (Brevo, WhatsApp, Qomon) pour permettre au CRM d'envoyer des campagnes ou de se synchroniser.
        </p>
      </div>

      <IntegrationEditor integrations={integrations} />
    </div>
  )
}
