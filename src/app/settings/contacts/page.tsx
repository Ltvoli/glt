import { requireSettingsAccess } from '@/lib/settings-auth'
import { getSystemLists } from '../system-list-actions'
import SystemListEditor from '../SystemListEditor'

export default async function SettingsContactsPage() {
  await requireSettingsAccess()
  
  const contactTypes = await getSystemLists('CONTACT_TYPE')
  const contactSources = await getSystemLists('CONTACT_SOURCE')
  const contactChannels = await getSystemLists('CONTACT_CHANNEL')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Contacts & Listes Référentielles</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez les listes déroulantes utilisées dans les fiches contacts de l'application. 
          Attention : modifier ou désactiver une valeur existante ne l'effacera pas des anciens contacts, mais elle ne sera plus proposée pour les nouveaux.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <SystemListEditor 
          title="Types de Contact" 
          description="Catégorisation principale du contact (ex: Électeur, Élu, Association...)"
          category="CONTACT_TYPE" 
          items={contactTypes} 
          hasColors={true}
        />

        <SystemListEditor 
          title="Sources d'Acquisition" 
          description="Comment ce contact est-il arrivé dans la base ? (ex: Permanence, Terrain...)"
          category="CONTACT_SOURCE" 
          items={contactSources} 
        />
        
        <SystemListEditor 
          title="Canaux de Communication" 
          description="Canaux privilégiés (ex: Email, Téléphone, SMS...)"
          category="CONTACT_CHANNEL" 
          items={contactChannels} 
        />
      </div>
    </div>
  )
}
