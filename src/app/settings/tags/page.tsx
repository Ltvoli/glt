import { requireSettingsAccess } from '@/lib/settings-auth'
import { getGlobalTags } from './tag-actions'
import TagEditor from './TagEditor'

export default async function SettingsTagsPage() {
  await requireSettingsAccess()
  
  const tags = await getGlobalTags()

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gestion Globale des Tags</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Cette interface vous permet de renommer, recolorer ou supprimer des tags existants sur tout le SaaS.
          <strong>Attention</strong> : la suppression d'un tag le détachera de tous les contacts et tâches qui lui sont liés.
        </p>
      </div>

      <TagEditor tags={tags} />
    </div>
  )
}
