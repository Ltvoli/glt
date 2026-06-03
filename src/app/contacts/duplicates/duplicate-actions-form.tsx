'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { dismissDuplicate } from './actions'

const initialState: any = { error: '', success: false }

export default function DuplicateActionsForm({ candidateId }: { candidateId: string, contact1Id: string, contact2Id: string }) {
  const [dismissState, dismissAction, isDismissing] = useActionState(dismissDuplicate, initialState)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      <Link 
        href={`/contacts/duplicates/${candidateId}/merge`}
        className="button"
        style={{ width: '100%', fontSize: '0.875rem', textAlign: 'center', display: 'block', textDecoration: 'none' }}
      >
        Fusionner...
      </Link>

      <div style={{ borderBottom: '1px solid var(--border)', margin: '0.5rem 0' }}></div>

      <form action={dismissAction}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <button type="submit" className="button outline danger" style={{ width: '100%', fontSize: '0.875rem' }} disabled={isDismissing}>
          Faux doublon (Ignorer)
        </button>
      </form>

      {(dismissState.error) && (
        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Erreur lors de l'action.
        </div>
      )}
    </div>
  )
}
