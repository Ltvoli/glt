import { requireSettingsAccess } from '@/lib/settings-auth'
import { getModules } from './module-actions'
import ModuleEditor from './ModuleEditor'

export default async function SettingsModulesPage() {
  await requireSettingsAccess()
  
  const modules = await getModules()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Activation des Modules</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Activez ou désactivez les fonctionnalités principales du CRM. Désactiver un module le masque pour tous les utilisateurs mais ne supprime pas ses données en base.
        </p>
      </div>

      <ModuleEditor modules={modules} />
    </div>
  )
}
