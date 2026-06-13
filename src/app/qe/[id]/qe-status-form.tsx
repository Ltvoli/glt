'use client'

import { useState, useTransition } from 'react'
import { updateQEStatus } from '../actions'

const STATUSES = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'DEPOSEE', label: 'Déposée / En attente' },
  { value: 'REPONSE_RECUE', label: 'Réponse reçue' },
  { value: 'RETOUR_EFFECTUE', label: 'Retour effectué au demandeur' },
]

export default function QEStatusForm({ qeId, currentStatus, dictionary = [] }: { qeId: string, currentStatus: string, dictionary?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(currentStatus)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setStatus(newStatus)
    startTransition(async () => {
      await updateQEStatus(qeId, newStatus)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label htmlFor="status" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Statut :</label>
      <select 
        id="status" 
        value={status} 
        onChange={handleChange}
        disabled={isPending}
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--background)',
          fontWeight: 500,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1
        }}
      >
        {dictionary.filter(d => d.type === 'QE_STATUS').map(d => (
          <option key={d.code} value={d.code}>{d.label}</option>
        ))}
      </select>
    </div>
  )
}
