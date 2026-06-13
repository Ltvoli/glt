'use client'

import { useState } from 'react'
import { Archive, CheckCircle, Search, MailOpen } from 'lucide-react'
import { batchUpdateMailStatus } from './actions'

export default function MailBatchActions({ selectedIds }: { selectedIds: string[] }) {
  const [isPending, setIsPending] = useState(false)

  if (selectedIds.length === 0) return null

  const handleBatchAction = async (status: string) => {
    setIsPending(true)
    try {
      await batchUpdateMailStatus(selectedIds, status)
    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'action de masse.")
    } finally {
      setIsPending(false)
    }
  }

  return (
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
          <Archive size={16} /> Classer (Archiver)
        </button>
      </div>
    </div>
  )
}
