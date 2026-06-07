import { requireSettingsAccess } from '@/lib/settings-auth'
import { getAppSettings } from '../actions'
import GeneralSettingsForm from './GeneralSettingsForm'

export default async function GeneralSettingsPage() {
  await requireSettingsAccess()
  const settings = await getAppSettings('GENERAL')

  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || ''
    return acc
  }, {} as Record<string, string>)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Paramètres Généraux</h2>
        <p style={{ color: 'var(--text-muted)' }}>Configuration globale du nom du site, adresse et fuseau horaire.</p>
      </div>

      <GeneralSettingsForm initialData={settingsMap} />
    </div>
  )
}
