import { requireSettingsAccess } from '@/lib/settings-auth'
import { getSystemLists } from '../system-list-actions'
import SystemListEditor from '../SystemListEditor'

export default async function SettingsCourriersPage() {
  await requireSettingsAccess()
  
  const mailCategories = await getSystemLists('MAIL_CATEGORY')
  const mailStatuses = await getSystemLists('MAIL_STATUS')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Paramètres des Courriers</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez les catégories et les statuts personnalisés pour le traitement des courriers entrants et sortants.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <SystemListEditor 
          title="Catégories de Courriers" 
          description="Ex: Demande citoyenne, Presse, Invitation..."
          category="MAIL_CATEGORY" 
          items={mailCategories} 
          hasColors={true}
        />

        <SystemListEditor 
          title="Statuts Personnalisés" 
          description="Statuts de suivi (ex: Reçu, En traitement, Classé...)"
          category="MAIL_STATUS" 
          items={mailStatuses} 
        />
      </div>
    </div>
  )
}
