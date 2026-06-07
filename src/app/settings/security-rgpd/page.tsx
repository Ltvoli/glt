import { requireSettingsAccess } from '@/lib/settings-auth'
import { getRgpdSettings } from './rgpd-actions'
import RgpdForm from './RgpdForm'

export default async function SettingsRgpdPage() {
  await requireSettingsAccess()
  
  const settings = await getRgpdSettings()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Sécurité & Conformité RGPD</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez les politiques de rétention des données et les paramètres légaux obligatoires pour la tenue d'un fichier de contacts politiques.
        </p>
      </div>

      <RgpdForm initialSettings={settings} />
    </div>
  )
}
