'use client'

import { useState, useTransition } from 'react'
import { submitTaskForValidation, validateTask, rejectTask } from './actions'
import { CheckCircle2, XCircle, Send, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function TaskValidationCard({
  task,
  currentUserId,
  userRole
}: {
  task: any
  currentUserId: string
  userRole: string
}) {
  const [isPending, startTransition] = useTransition()
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const isValidator = task.validatorId === currentUserId || userRole === 'ADMINISTRATEUR'
  const isAssignee = task.assigneeId === currentUserId

  const handleValidation = () => {
    setErrorMsg('')
    startTransition(async () => {
      const res = await validateTask(task.id)
      if (res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  const handleRejection = () => {
    if (!rejectionReason.trim()) {
      setErrorMsg('Veuillez spécifier le motif du rejet ou les modifications souhaitées.')
      return
    }
    setErrorMsg('')
    startTransition(async () => {
      const res = await rejectTask(task.id, rejectionReason)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setShowRejectInput(false)
        setRejectionReason('')
      }
    })
  }

  const handleSubmitValidation = () => {
    setErrorMsg('')
    startTransition(async () => {
      const res = await submitTaskForValidation(task.id)
      if (res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  const validatorName = task.validator
    ? `${task.validator.firstName} ${task.validator.lastName}`
    : 'Lionel Tivoli'

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      padding: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Validation de la tâche
          </h3>
        </div>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Responsable : <strong>{validatorName}</strong>
        </span>
      </div>

      {/* Affichage du statut de validation */}
      {task.validationStatus === 'A_VALIDER' && (
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={16} />
          <span>Cette tâche est actuellement <strong>en attente de validation</strong> par {validatorName}.</span>
        </div>
      )}

      {task.validationStatus === 'REJETE' && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fca5a5',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <XCircle size={16} /> Tâche rejetée / Modifications demandées :
          </div>
          <div>{task.rejectionReason}</div>
        </div>
      )}

      {task.validationStatus === 'VALIDE' && (
        <div style={{
          backgroundColor: '#d1fae5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>Tâche validée avec succès{task.validatedBy ? ` par ${task.validatedBy.firstName} ${task.validatedBy.lastName}` : ''} {task.validatedAt ? `le ${new Date(task.validatedAt).toLocaleDateString('fr-FR')}` : ''}.</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Actions disponibles */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Si la tâche n'est pas actuellement en attente de validation */}
        {task.status !== 'A_VALIDER' && (
          <button
            type="button"
            className="button outline"
            onClick={handleSubmitValidation}
            disabled={isPending}
            style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: '#f59e0b', color: '#b45309' }}
          >
            <Send size={16} />
            {isPending ? 'Soumission...' : '🛡️ Soumettre cette tâche à la validation de Lionel Tivoli'}
          </button>
        )}

        {/* Si l'utilisateur est le valideur ou un admin et que la tâche est A_VALIDER */}
        {task.status === 'A_VALIDER' && isValidator && !showRejectInput && (
          <>
            <button
              type="button"
              className="button"
              onClick={handleValidation}
              disabled={isPending}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <CheckCircle2 size={16} />
              {isPending ? 'Validation en cours...' : 'Valider et Archiver la tâche'}
            </button>

            <button
              type="button"
              className="button outline"
              onClick={() => setShowRejectInput(true)}
              disabled={isPending}
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <XCircle size={16} />
              Retoquer avec un commentaire
            </button>
          </>
        )}

        {/* Zone de formulaire pour spécifier le motif du rejet */}
        {showRejectInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Expliquez ce qui doit être révisé ou corrigé..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="button"
                onClick={handleRejection}
                disabled={isPending}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.85rem' }}
              >
                Confirmer le refus
              </button>
              <button
                type="button"
                className="button outline"
                onClick={() => { setShowRejectInput(false); setRejectionReason('') }}
                disabled={isPending}
                style={{ fontSize: '0.85rem' }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
