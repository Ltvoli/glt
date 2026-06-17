'use client'

import { useState } from 'react'
import { AlertCircle, AlertTriangle, Info, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { purgeLogsAction } from './actions'

type AppLog = {
  id: string
  level: string
  source: string
  message: string
  details: any
  userId: string | null
  createdAt: string
}

const LEVEL_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  ERROR: { bg: '#fef2f2', color: '#b91c1c', icon: <AlertCircle size={14} /> },
  WARNING: { bg: '#fffbeb', color: '#b45309', icon: <AlertTriangle size={14} /> },
  INFO: { bg: '#eff6ff', color: '#1d4ed8', icon: <Info size={14} /> },
}

export default function LogsClient({ logs, totalCount }: { logs: AppLog[], totalCount: number }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handlePurge = async (days: number) => {
    if (!confirm(`Supprimer tous les logs de plus de ${days} jours ?`)) return
    setIsPending(true)
    try {
      await purgeLogsAction(days)
      window.location.reload()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div>
      {/* Résumé + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          {totalCount} entrée{totalCount > 1 ? 's' : ''} au total
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.location.reload()}
            className="button outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          <button
            onClick={() => handlePurge(30)}
            disabled={isPending}
            className="button outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#ef4444', borderColor: '#ef4444' }}
          >
            <Trash2 size={14} /> Purger + 30j
          </button>
        </div>
      </div>

      {/* Liste des logs */}
      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Info size={32} style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Aucun log enregistré</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Les erreurs techniques apparaîtront ici.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map(log => {
            const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO
            const isExpanded = expanded === log.id
            return (
              <div key={log.id} className="card" style={{ padding: '0', overflow: 'hidden', border: `1px solid ${style.color}22` }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: style.bg,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: style.color, flexShrink: 0 }}>{style.icon}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: style.color,
                    backgroundColor: `${style.color}22`,
                    padding: '0.125rem 0.4rem',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}>
                    {log.level}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', flexShrink: 0, fontFamily: 'monospace' }}>
                    [{log.source}]
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.message}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderTop: `1px solid ${style.color}22` }}>
                    {log.userId && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        <strong>Utilisateur :</strong> {log.userId}
                      </p>
                    )}
                    {log.details && (
                      <pre style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#1e293b',
                        color: '#e2e8f0',
                        padding: '1rem',
                        borderRadius: '6px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        margin: 0,
                      }}>
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
