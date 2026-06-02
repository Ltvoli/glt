'use client'

import { useState, useTransition } from 'react'
import { updateQEResponse } from '../actions'

export default function QEResponseForm({ qeId, initialResponse }: { qeId: string, initialResponse: string | null }) {
  const [isEditing, setIsEditing] = useState(!initialResponse)
  const [response, setResponse] = useState(initialResponse || '')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateQEResponse(qeId, response)
      setIsEditing(false)
    })
  }

  if (!isEditing && initialResponse) {
    return (
      <div>
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1rem' }}>
          {initialResponse}
        </div>
        <button onClick={() => setIsEditing(true)} className="button outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
          Modifier la réponse
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <textarea
        className="form-control"
        rows={8}
        placeholder="Collez ici la réponse publiée au Journal Officiel..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        disabled={isPending}
      ></textarea>
      
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleSave} className="button" disabled={isPending || !response.trim()}>
          {isPending ? 'Enregistrement...' : 'Enregistrer la réponse'}
        </button>
        {initialResponse && (
          <button onClick={() => setIsEditing(false)} className="button outline" disabled={isPending}>
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}
