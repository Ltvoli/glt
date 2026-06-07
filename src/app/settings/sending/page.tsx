import { requireSettingsAccess } from '@/lib/settings-auth'
import { getSendingSettings } from './sending-actions'
import SendingForm from './SendingForm'

export default async function SettingsSendingPage() {
  await requireSettingsAccess()
  
  const settings = await getSendingSettings()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Quotas & Expéditeur</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Définissez l'identité d'expédition par défaut de vos communications et sécurisez votre budget en limitant le nombre d'envois journaliers.
        </p>
      </div>

      <SendingForm initialSettings={settings} />
    </div>
  )
}
