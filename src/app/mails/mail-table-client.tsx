'use client'

import { useState } from 'react'
import { Archive, CheckCircle, MailOpen, AlertCircle, Package, Mail, Clock } from 'lucide-react'
import Link from 'next/link'
import { batchUpdateMailStatus } from './actions'
import { useRouter } from 'next/navigation'

export default function MailTableClient({ mails }: { mails: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleRowClick = (id: string) => {
    router.push(`/mails/${id}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Reçu</span>
      case 'LU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Lu</span>
      case 'EN_TRAITEMENT': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>En traitement</span>
      case 'REPONDU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Répondu</span>
      case 'CLASSE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Classé</span>
      default: return <span>{status}</span>
    }
  }

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(mails.map(m => m.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBatchAction = async (status: string) => {
    if (selectedIds.length === 0) return
    setIsPending(true)
    try {
      await batchUpdateMailStatus(selectedIds, status)
      setSelectedIds([]) // Clear selection after success
    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'action de masse.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={mails.length > 0 && selectedIds.length === mails.length}
                />
              </th>
              <th>Référence & Type</th>
              <th>Date</th>
              <th>Sujet & Interlocuteur</th>
              <th>Canal</th>
              <th>Assigné à</th>
              <th>Statut & Échéance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mails.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucun courrier trouvé.
                </td>
              </tr>
            ) : (
              mails.map(mail => (
                <tr 
                  key={mail.id} 
                  onClick={() => handleRowClick(mail.id)}
                  style={{ 
                    borderLeft: mail.urgency === 'HAUTE' ? '4px solid var(--danger)' : '4px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(mail.id)}
                      onChange={() => toggleSelect(mail.id)}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{mail.reference}</div>
                    <div style={{ fontSize: '0.75rem', color: mail.type === 'ENTRANT' ? 'var(--primary)' : 'var(--warning)' }}>{mail.type}</div>
                  </td>
                  <td>{mail.type === 'ENTRANT' && mail.receiveDate ? new Date(mail.receiveDate).toLocaleDateString('fr-FR') : mail.sentDate ? new Date(mail.sentDate).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {mail.urgency === 'HAUTE' && <AlertCircle size={14} color="var(--danger)" />}
                      {mail.subject}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {mail.type === 'ENTRANT' ? (mail.senderName || 'Inconnu') : (mail.recipientName || 'Inconnu')} {mail.city ? `(${mail.city})` : ''}
                      {mail.links && mail.links.some((l: any) => l.contact) && (
                         <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                           🔗 Lié à un contact
                         </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {mail.channel === 'POSTAL' ? <span title="Postal"><Package size={16} /></span> : <span title="Email/Autre"><Mail size={16} /></span>}
                  </td>
                  <td>{mail.assignee?.name || '-'}</td>
                  <td>
                    <div style={{ marginBottom: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      {getStatusBadge(mail.status)}
                      {mail.validationStatus === 'A_VALIDER' && (
                        <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ffedd5', color: '#ea580c', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          À valider
                        </span>
                      )}
                      {mail.validationStatus === 'REJETE' && (
                        <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Rejeté
                        </span>
                      )}
                    </div>
                    {mail.responseDueDate && mail.status !== 'REPONDU' && mail.status !== 'CLASSE' && (
                      <div style={{ fontSize: '0.75rem', color: new Date(mail.responseDueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {new Date(mail.responseDueDate).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link href={`/mails/${mail.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          zIndex: 50,
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {selectedIds.length} sélectionné(s)
          </span>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleBatchAction('LU')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <MailOpen size={16} /> Marquer comme Lu
            </button>
            <button 
              onClick={() => handleBatchAction('REPONDU')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <CheckCircle size={16} /> Marquer comme Répondu
            </button>
            <button 
              onClick={() => handleBatchAction('CLASSE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)' }}
            >
              <Archive size={16} /> Classer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
