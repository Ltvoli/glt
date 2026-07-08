'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'

export default function ShareWidget({ permanenceId, permanenceStatus }: { permanenceId: string, permanenceStatus: string }) {
  const [copied, setCopied] = useState(false)

  const getPublicUrl = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/public/permanence/${permanenceId}`
  }

  const handleCopy = () => {
    const url = getPublicUrl()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Si la permanence est en brouillon, elle n'est pas encore visible publiquement
  const isDraft = permanenceStatus === 'DRAFT'

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
          <Share2 size={18} style={{ color: 'var(--primary)' }} />
          Portail Public de Recrutement
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {isDraft 
            ? 'Publiez ou validez cette permanence pour rendre sa page d\'inscription accessible au public.'
            : 'Partagez ce lien unique avec les citoyens et sur vos réseaux pour recueillir les inscriptions en ligne.'
          }
        </p>
      </div>

      {!isDraft ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            readOnly
            value={getPublicUrl()}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              background: '#f8fafc',
              color: '#64748b'
            }}
            onClick={e => (e.currentTarget as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: '0.5rem',
              background: copied ? 'var(--success)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              minWidth: '38px'
            }}
            title="Copier le lien public"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      ) : (
        <div style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          background: '#f1f5f9',
          color: '#64748b',
          fontSize: '0.8rem',
          textAlign: 'center',
          fontWeight: 500
        }}>
          Page hors ligne (Brouillon)
        </div>
      )}
    </div>
  )
}
