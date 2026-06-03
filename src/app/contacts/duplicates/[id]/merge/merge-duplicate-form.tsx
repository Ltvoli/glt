'use client'

import { useState, useActionState } from 'react'
import { advancedMergeDuplicate } from '../../actions'
import { Check } from 'lucide-react'

const FIELDS = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Téléphone Fixe' },
  { key: 'mobilePhone', label: 'Téléphone Mobile' },
  { key: 'address', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'zipCode', label: 'Code Postal' },
  { key: 'notes', label: 'Notes' },
]

export default function MergeDuplicateForm({ candidateId, contact1, contact2 }: { candidateId: string, contact1: any, contact2: any }) {
  const [selectedFields, setSelectedFields] = useState<Record<string, 'c1' | 'c2'>>(() => {
    const initial: Record<string, 'c1' | 'c2'> = {}
    for (const f of FIELDS) {
      initial[f.key] = 'c1' // Default to c1
    }
    return initial
  })

  // We bind the data to the action since formData might be tricky with dynamic fields
  const mergeActionWithData = advancedMergeDuplicate.bind(null, {
    candidateId,
    contact1Id: contact1.id,
    contact2Id: contact2.id,
    selectedFields
  })

  const [state, formAction, isPending] = useActionState(mergeActionWithData, { error: '' })

  return (
    <form action={formAction}>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Headers */}
        <div style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Champ</div>
        <div style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
          Contact 1<br/>
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{contact1.id}</span>
        </div>
        <div style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
          Contact 2<br/>
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{contact2.id}</span>
        </div>

        {/* Rows */}
        {FIELDS.map(f => (
          <div key={f.key} style={{ display: 'contents' }}>
            <div style={{ alignSelf: 'center', fontWeight: 500 }}>{f.label}</div>
            
            {/* C1 Option */}
            <div 
              onClick={() => setSelectedFields(p => ({ ...p, [f.key]: 'c1' }))}
              style={{ 
                padding: '0.75rem', 
                border: selectedFields[f.key] === 'c1' ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: selectedFields[f.key] === 'c1' ? '#eff6ff' : 'white'
              }}
            >
              {selectedFields[f.key] === 'c1' && <Check size={16} style={{ position: 'absolute', top: 5, right: 5, color: 'var(--primary)' }}/>}
              {contact1[f.key] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Vide</span>}
            </div>

            {/* C2 Option */}
            <div 
              onClick={() => setSelectedFields(p => ({ ...p, [f.key]: 'c2' }))}
              style={{ 
                padding: '0.75rem', 
                border: selectedFields[f.key] === 'c2' ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: selectedFields[f.key] === 'c2' ? '#eff6ff' : 'white'
              }}
            >
              {selectedFields[f.key] === 'c2' && <Check size={16} style={{ position: 'absolute', top: 5, right: 5, color: 'var(--primary)' }}/>}
              {contact2[f.key] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Vide</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Fusion en cours...' : 'Valider la fusion'}
        </button>
      </div>

      {state?.error && (
        <div style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'right' }}>
          {state.error}
        </div>
      )}
    </form>
  )
}
