'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, X, Loader2, Eye, Download, Edit, CheckCircle, RotateCcw, FileText } from 'lucide-react'
import { getDocumentAccessLogs } from './actions'
import { toast } from 'sonner'

interface DocumentAuditLogModalProps {
  doc: any
  isOpen: boolean
  onClose: () => void
}

export default function DocumentAuditLogModal({ doc, isOpen, onClose }: DocumentAuditLogModalProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && doc?.id) {
      setIsLoading(true)
      getDocumentAccessLogs(doc.id)
        .then(setLogs)
        .catch(() => toast.error("Erreur lors du chargement des journaux d'accès"))
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, doc])

  if (!isOpen || !doc) return null

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VIEW':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><Eye size={12} /> Consultation</span>
      case 'DOWNLOAD':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><Download size={12} /> Téléchargement</span>
      case 'EDIT':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><Edit size={12} /> Modification</span>
      case 'SIGN':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={12} /> Signature certifiée</span>
      case 'RESTORE_VERSION':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffedd5', color: '#c2410c', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><RotateCcw size={12} /> Restauration version</span>
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}><FileText size={12} /> {action}</span>
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '650px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Journal d'Audit & Traçabilité</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {doc.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Logs list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
              Chargement du journal d'accès...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Aucun événement d'accès enregistré pour ce document.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {logs.map(log => (
                <div 
                  key={log.id} 
                  style={{
                    padding: '0.85rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                    backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {getActionBadge(log.action)}
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                        {log.userName}
                      </p>
                      {log.details && (
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
