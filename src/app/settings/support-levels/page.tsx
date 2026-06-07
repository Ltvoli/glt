import { requireSettingsAccess } from '@/lib/settings-auth'
import { getSystemLists } from '../system-list-actions'
import { isSupportLevelEnabled } from './support-level-actions'
import SystemListEditor from '../SystemListEditor'
import ToggleSupportLevel from './ToggleSupportLevel'
import { ShieldAlert } from 'lucide-react'

export default async function SettingsSupportLevelsPage() {
  await requireSettingsAccess()
  
  const supportLevels = await getSystemLists('SUPPORT_LEVEL')
  const isEnabled = await isSupportLevelEnabled()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Niveaux de Soutien (RGPD)</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gestion de l'échelle d'évaluation politique des contacts. Conformément au RGPD, la collecte des opinions politiques (même implicites) est encadrée.
        </p>
      </div>

      <ToggleSupportLevel initialEnabled={isEnabled} />

      {isEnabled ? (
        <div style={{ maxWidth: '800px' }}>
          <SystemListEditor 
            title="Échelle des niveaux" 
            description="L'échelle standard va de 1 (Très défavorable) à 5 (Très favorable). Vous pouvez la personnaliser ici."
            category="SUPPORT_LEVEL" 
            items={supportLevels} 
            hasColors={true}
          />
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Module désactivé</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Vous avez désactivé la collecte des niveaux de soutien. Réactivez le module ci-dessus pour modifier les paramètres de l'échelle.
          </p>
        </div>
      )}
    </div>
  )
}
