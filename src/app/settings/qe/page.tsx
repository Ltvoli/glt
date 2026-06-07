import { requireSettingsAccess } from '@/lib/settings-auth'
import { getSystemLists } from '../system-list-actions'
import SystemListEditor from '../SystemListEditor'

export default async function SettingsQEPage() {
  await requireSettingsAccess()
  
  const qeThemes = await getSystemLists('QE_THEME')
  const qeMinistries = await getSystemLists('QE_MINISTRY')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Questions Écrites & QAG</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez les thèmes et les ministères associés aux questions posées à l'Assemblée.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <SystemListEditor 
          title="Thèmes" 
          description="Ex: Agriculture, Sécurité, Santé..."
          category="QE_THEME" 
          items={qeThemes} 
          hasColors={true}
        />

        <SystemListEditor 
          title="Ministères" 
          description="Ex: Ministère de l'Intérieur, Ministère de la Justice..."
          category="QE_MINISTRY" 
          items={qeMinistries} 
        />
      </div>
    </div>
  )
}
