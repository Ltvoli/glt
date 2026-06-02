'use client'

import { useTransition } from 'react'
import { upsertEmployeeStatus } from './planning/actions'

const STATUSES = [
  { value: 'PARIS', label: 'AN (Paris)', color: '#2563eb', bg: '#dbeafe' },
  { value: 'CIRCO', label: 'Circonscription', color: '#854d0e', bg: '#fef08a' },
  { value: 'TELETRAVAIL', label: 'Télétravail', color: '#475569', bg: '#e2e8f0' },
  { value: 'DEPLACEMENT', label: 'Déplacement', color: '#c2410c', bg: '#ffedd5' },
  { value: 'CONGE', label: 'Congé', color: '#16a34a', bg: '#dcfce3' },
  { value: 'MALADIE', label: 'Maladie', color: '#dc2626', bg: '#fee2e2' },
]

export default function StatusWidget({ currentStatus }: { currentStatus?: string }) {
  const [isPending, startTransition] = useTransition()

  const handleStatusUpdate = (status: string) => {
    startTransition(async () => {
      // Pour aujourd'hui
      const today = new Date().toISOString()
      await upsertEmployeeStatus(today, status)
    })
  }

  return (
    <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Où travaillez-vous aujourd'hui ?
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {STATUSES.map(s => {
          const isSelected = currentStatus === s.value
          return (
            <button
              key={s.value}
              onClick={() => handleStatusUpdate(s.value)}
              disabled={isPending}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? s.color : 'transparent'}`,
                backgroundColor: s.bg,
                color: s.color,
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
