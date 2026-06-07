'use client'

import { useState, useTransition } from 'react'
import { toggleSupportLevel } from './support-level-actions'

export default function ToggleSupportLevel({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleToggle = () => {
    const newValue = !enabled
    
    // Si on désactive, on demande confirmation (RGPD)
    if (!newValue) {
      if (!confirm('Attention : Désactiver cette fonctionnalité masquera les niveaux de soutien sur toutes les fiches (les données historiques seront conservées en base). Êtes-vous sûr ?')) {
        return
      }
    }

    setEnabled(newValue)
    setError('')

    startTransition(async () => {
      try {
        await toggleSupportLevel(newValue)
      } catch (err: any) {
        setError(err.message || 'Erreur inconnue')
        setEnabled(enabled) // rollback
      }
    })
  }

  return (
    <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--primary)' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Fonctionnalité "Niveau de Soutien"</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Évaluer le niveau de soutien politique (1 à 5) est une donnée sensible au sens du RGPD. 
          Vous pouvez désactiver complètement ce module si vous n'en avez pas l'utilité ou l'autorisation.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
        <button 
          onClick={handleToggle}
          disabled={isPending}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            fontWeight: 600,
            cursor: isPending ? 'wait' : 'pointer',
            backgroundColor: enabled ? 'var(--success)' : 'var(--text-muted)',
            color: 'white',
            transition: 'background-color 0.2s',
            minWidth: '120px'
          }}
        >
          {isPending ? '...' : (enabled ? 'MODULE ACTIVÉ' : 'MODULE DÉSACTIVÉ')}
        </button>
        {error && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{error}</span>}
      </div>
    </div>
  )
}
