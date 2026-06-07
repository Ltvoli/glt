import { requireSettingsAccess } from '@/lib/settings-auth'
import { getAutomations } from './automation-actions'
import AutomationEditor from './AutomationEditor'

export default async function SettingsAutomationsPage() {
  await requireSettingsAccess()
  
  const rules = await getAutomations()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Règles d'Automatisation</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Activez ou désactivez les comportements automatiques du CRM (nettoyage de base, rappels de tâches par email, tags automatiques).
        </p>
      </div>

      <AutomationEditor rules={rules} />
    </div>
  )
}
