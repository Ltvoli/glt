import { requireSettingsAccess } from '@/lib/settings-auth'
import { getExportLogs } from './export-actions'
import ExportButton from './ExportButton'
import { FileText, Database, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default async function SettingsExportsPage() {
  await requireSettingsAccess()
  
  const logs = await getExportLogs()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Exports & Sauvegardes</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Historique complet des téléchargements de listes de contacts et des sauvegardes manuelles de la base de données.
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Historique récent</h3>
        
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun export ou sauvegarde n'a été effectué.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map(log => {
              let fileUrl = null
              try {
                if (log.details) {
                  const parsed = JSON.parse(log.details)
                  if (parsed.fileUrl) fileUrl = parsed.fileUrl
                }
              } catch (e) {}

              return (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {log.type === 'EXPORT_CONTACTS' ? <FileText size={24} style={{ color: 'var(--primary)' }} /> : <Database size={24} style={{ color: '#0ea5e9' }} />}
                  <div>
                    <h4 style={{ fontWeight: 600, margin: 0, fontSize: '0.875rem' }}>
                      {log.type === 'EXPORT_CONTACTS' ? 'Export liste de contacts' : 'Sauvegarde BDD complète'}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Demandé le {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {log.status === 'SUCCESS' && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={16} /> Terminé</span>}
                  {log.status === 'PENDING' && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning-dark)', fontSize: '0.75rem', fontWeight: 600 }}><Clock size={16} /> En cours</span>}
                  {log.status === 'ERROR' && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}><AlertCircle size={16} /> Échec</span>}
                  
                  {fileUrl && log.status === 'SUCCESS' && (
                    <a href={fileUrl} className="button-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} download>
                      Télécharger
                    </a>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}
