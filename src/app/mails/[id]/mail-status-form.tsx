'use client'

import { useState, useTransition } from 'react'
import { updateMailStatus } from '../actions'

const STATUSES = [
  { value: 'RECU', label: 'Reçu' },
  { value: 'LU', label: 'Lu' },
  { value: 'EN_TRAITEMENT', label: 'En traitement' },
  { value: 'REPONDU', label: 'Répondu' },
  { value: 'CLASSE', label: 'Classé' },
]

export default function MailStatusForm({ mailId, currentStatus, dictionary = [] }: { mailId: string, currentStatus: string, dictionary?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(currentStatus)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setStatus(newStatus)
    startTransition(async () => {
      await updateMailStatus(mailId, newStatus)
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
        {dictionary.filter(d => d.type === 'MAIL_STATUS').map(d => (
          <option key={d.code} value={d.code}>{d.label}</option>
        ))}
      </select>
    </div>
  )
}
