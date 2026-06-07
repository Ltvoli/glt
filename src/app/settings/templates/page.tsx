import { requireSettingsAccess } from '@/lib/settings-auth'
import { getTemplates } from './template-actions'
import TemplateEditor from './TemplateEditor'

export default async function SettingsTemplatesPage() {
  await requireSettingsAccess()
  
  const templates = await getTemplates()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Modèles de Messages</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Gérez vos templates pré-enregistrés pour envoyer rapidement des e-mails, des SMS ou des messages WhatsApp personnalisés.
        </p>
      </div>

      <TemplateEditor templates={templates} />
    </div>
  )
}
