'use client'

import { useActionState } from 'react'
import { mergeDuplicate, dismissDuplicate } from './actions'

const initialState: any = { error: '', success: false }

export default function DuplicateActionsForm({ candidateId, contact1Id, contact2Id }: { candidateId: string, contact1Id: string, contact2Id: string }) {
  const [mergeState1, mergeAction1, isMerging1] = useActionState(mergeDuplicate, initialState)
  const [mergeState2, mergeAction2, isMerging2] = useActionState(mergeDuplicate, initialState)
  const [dismissState, dismissAction, isDismissing] = useActionState(dismissDuplicate, initialState)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      <form action={mergeAction1}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="keepContactId" value={contact1Id} />
        <input type="hidden" name="deleteContactId" value={contact2Id} />
        <button type="submit" className="button" style={{ width: '100%', fontSize: '0.875rem' }} disabled={isMerging1 || isMerging2 || isDismissing}>
          Garder le Contact 1 (à gauche)
        </button>
      </form>

      <form action={mergeAction2}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="keepContactId" value={contact2Id} />
        <input type="hidden" name="deleteContactId" value={contact1Id} />
        <button type="submit" className="button" style={{ width: '100%', fontSize: '0.875rem' }} disabled={isMerging1 || isMerging2 || isDismissing}>
          Garder le Contact 2 (à droite)
        </button>
      </form>

      <div style={{ borderBottom: '1px solid var(--border)', margin: '0.5rem 0' }}></div>

      <form action={dismissAction}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <button type="submit" className="button outline danger" style={{ width: '100%', fontSize: '0.875rem' }} disabled={isMerging1 || isMerging2 || isDismissing}>
          Faux doublon (Ignorer)
        </button>
      </form>

      {(mergeState1.error || mergeState2.error || dismissState.error) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Erreur lors de l'action.
        </div>
      )}
    </div>
  )
}
