import { requireSettingsAccess } from '@/lib/settings-auth'
import { getPlanningSettings } from './planning-actions'
import PlanningForm from './PlanningForm'

export default async function SettingsPlanningPage() {
  await requireSettingsAccess()
  
  const settings = await getPlanningSettings()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Planning Salariés</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Configurez ici les variables globales permettant au module Planning de calculer correctement les droits à congés de l'équipe.
        </p>
      </div>

      <PlanningForm initialSettings={settings} />
    </div>
  )
}
