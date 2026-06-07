'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { transitionPermanenceStatus } from '../actions'

type WorkflowButtonsProps = {
  permanenceId: string
  currentStatus: string
  score: number
  hasBlockages: boolean
  hasValidatePermission: boolean
  isAdminOrSuper: boolean
  isReadOnly: boolean
}

export default function WorkflowButtons({
  permanenceId,
  currentStatus,
  score,
  hasBlockages,
  hasValidatePermission,
  isAdminOrSuper,
  isReadOnly
}: WorkflowButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleTransition = async (newStatus: string, comment?: string) => {
    setLoading(true)
    setError(null)
    const res = await transitionPermanenceStatus(permanenceId, newStatus as any, comment)
    if (!res.success) {
      setError(res.error || 'Erreur lors du changement de statut.')
    } else {
      setShowRejectForm(false)
      setRejectComment('')
      router.refresh()
    }
    setLoading(false)
  }

  if (isReadOnly) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
        Lecture seule
      </div>
    )
  }

  if (currentStatus === 'ARCHIVED') {
    return (
      <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', padding: '0.5rem' }}>
        Permanence archivée.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* ERRORS */}
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem' }}>
          {error}
        </div>
      )}

      {/* DRAFT / IN_PROGRESS / TO_CORRECT */}
      {(currentStatus === 'DRAFT' || currentStatus === 'IN_PROGRESS' || currentStatus === 'TO_CORRECT') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => handleTransition('READY')}
            disabled={loading || score < 80 || hasBlockages}
            className="button"
            style={{ width: '100%' }}
          >
            {loading ? 'Traitement...' : 'Soumettre à validation'}
          </button>
          
          {(score < 80 || hasBlockages) && (
            <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontStyle: 'italic', textAlign: 'center' }}>
              Bloqué : score &lt; 80% ou tâches obligatoires en attente.
            </span>
          )}
        </div>
      )}

      {/* READY (Needs deputy validation) */}
      {currentStatus === 'READY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {hasValidatePermission ? (
            <>
              {!showRejectForm ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleTransition('VALIDATED')}
                    disabled={loading}
                    className="button"
                    style={{ flex: 1, backgroundColor: 'var(--success)' }}
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading}
                    className="button danger"
                    style={{ flex: 1 }}
                  >
                    Renvoyer
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <label className="block text-xs font-semibold text-gray-700">Motif du renvoi (requis)</label>
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={2}
                    className="form-control"
                    placeholder="Précisez les corrections à apporter..."
                    style={{ fontSize: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleTransition('TO_CORRECT', rejectComment)}
                      disabled={loading || !rejectComment.trim()}
                      className="button danger"
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectComment(''); }}
                      disabled={loading}
                      className="button outline"
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center' }}>
              En attente de validation par le député.
            </div>
          )}
        </div>
      )}

      {/* VALIDATED (Can be archived by admin+) */}
      {currentStatus === 'VALIDATED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.25rem' }}>
            Permanence validée par le député.
          </div>
          {isAdminOrSuper && (
            <button
              onClick={() => handleTransition('ARCHIVED')}
              disabled={loading}
              className="button outline danger"
              style={{ width: '100%' }}
            >
              {loading ? 'Traitement...' : 'Archiver la permanence'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
