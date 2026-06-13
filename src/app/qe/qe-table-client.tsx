'use client'

import { useState } from 'react'
import { Archive, CheckCircle, AlertTriangle, ArrowRightCircle } from 'lucide-react'
import Link from 'next/link'
import { relaunchQe, redepositQe, batchUpdateQeStatus } from './actions'

export default function QeTableClient({ questions }: { questions: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROUILLON': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Brouillon</span>
      case 'EN_ATTENTE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>En attente</span>
      case 'REPONSE_RECUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Réponse Reçue</span>
      case 'RETOUR_EFFECTUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Retour Effectué</span>
      default: return <span>{status}</span>
    }
  }

  const getDelayAlert = (status: string, depositDate: Date | null) => {
    if (status !== 'EN_ATTENTE' || !depositDate) return { text: '-', isLate: false }
    const daysDiff = Math.floor((new Date().getTime() - new Date(depositDate).getTime()) / (1000 * 3600 * 24))
    if (daysDiff >= 60) {
      return { text: `${daysDiff}j (Alerte >60j)`, isLate: true }
    }
    return { text: `${daysDiff}j`, isLate: false }
  }

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(questions.map(q => q.id))
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
      await batchUpdateQeStatus(selectedIds, status)
      setSelectedIds([])
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
                  checked={questions.length > 0 && selectedIds.length === questions.length}
                />
              </th>
              <th>Numéro / Titre</th>
              <th>Ministère</th>
              <th>Thématique</th>
              <th>Date de Dépôt</th>
              <th>Statut</th>
              <th>Délai</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune question trouvée.
                </td>
              </tr>
            ) : (
              questions.map(qe => {
                const delay = getDelayAlert(qe.status, qe.depositDate)
                return (
                  <tr key={qe.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(qe.id)}
                        onChange={() => toggleSelect(qe.id)}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>
                          {qe.type}
                        </span>
                        {qe.anNumber && <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>#{qe.anNumber}</span>}
                        {qe.title}
                      </div>
                    </td>
                    <td>{qe.ministry || '-'}</td>
                    <td>{qe.theme || '-'}</td>
                    <td>{qe.depositDate ? new Date(qe.depositDate).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>{getStatusBadge(qe.status)}</td>
                    <td>
                      {delay.isLate ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={14} /> {delay.text}
                        </span>
                      ) : (
                        <span>{delay.text}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link href={`/qe/${qe.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          Voir
                        </Link>
                        {delay.isLate && (
                          <>
                            <button 
                              onClick={async () => { await relaunchQe(qe.id) }} 
                              className="button outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                            >
                              Relancer
                            </button>
                            <button 
                              onClick={async () => { await redepositQe(qe.id) }} 
                              className="button outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            >
                              Redéposer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

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
            {selectedIds.length} sélectionnée(s)
          </span>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleBatchAction('REPONSE_RECUE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <CheckCircle size={16} /> Réponse Reçue
            </button>
            <button 
              onClick={() => handleBatchAction('RETOUR_EFFECTUE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#0284c7', borderColor: '#0284c7' }}
            >
              <ArrowRightCircle size={16} /> Retour Effectué
            </button>
          </div>
        </div>
      )}
    </>
  )
}
