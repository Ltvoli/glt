'use client'

import { useState, useActionState } from 'react'
import { advancedMergeDuplicate } from '../../actions'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

const FIELDS = [
  { key: 'firstName',       label: 'Prénom' },
  { key: 'lastName',        label: 'Nom' },
  { key: 'usageName',       label: "Nom d'usage" },
  { key: 'email',           label: 'Email' },
  { key: 'phone',           label: 'Téléphone fixe' },
  { key: 'mobilePhone',     label: 'Mobile' },
  { key: 'streetName',      label: 'Rue' },
  { key: 'city',            label: 'Ville' },
  { key: 'postalCode',      label: 'Code postal' },
  { key: 'supportLevel',    label: 'Niveau de soutien' },
  { key: 'notes',           label: 'Notes' },
]

type Side = 'c1' | 'c2'

export default function MergeDuplicateForm({
  candidateId,
  contact1,
  contact2,
}: {
  candidateId: string
  contact1: any
  contact2: any
}) {
  // Par défaut on garde le contact1 pour tous les champs
  const [selections, setSelections] = useState<Record<string, Side>>(() => {
    const init: Record<string, Side> = {}
    for (const f of FIELDS) init[f.key] = 'c1'
    return init
  })

  // keepContactId = contact1 si majorité de c1, sinon contact2
  // (en pratique l'utilisateur choisit champ par champ → on garde contact1 comme base
  //  et on copie dessus les champs sélectionnés depuis c2)
  const keepContactId   = contact1.id
  const deleteContactId = contact2.id

  const [state, formAction, isPending] = useActionState(advancedMergeDuplicate, { error: '' })

  const val = (contact: any, key: string) => {
    const v = contact[key]
    if (v === null || v === undefined || v === '') return <em style={{ color: '#94a3b8' }}>—</em>
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
    if (v instanceof Date || (typeof v === 'string' && key.includes('Date'))) {
      return new Date(v).toLocaleDateString('fr-FR')
    }
    return String(v)
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Champs cachés */}
      <input type="hidden" name="candidateId"     value={candidateId} />
      <input type="hidden" name="keepContactId"   value={keepContactId} />
      <input type="hidden" name="deleteContactId" value={deleteContactId} />

      {/* Pour chaque champ sélectionné : envoyer la valeur choisie */}
      {FIELDS.map(f => (
        <input
          key={`hidden_${f.key}`}
          type="hidden"
          name={`field_${f.key}`}
          value={selections[f.key] === 'c1' ? (contact1[f.key] ?? '') : (contact2[f.key] ?? '')}
        />
      ))}

      {/* En-têtes */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 48px 1fr', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Champ
        </div>
        <div style={{
          padding: '0.65rem 1rem', borderRadius: '8px', textAlign: 'center',
          background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
          fontWeight: 700, fontSize: '0.875rem',
        }}>
          {contact1.firstName} {contact1.lastName}
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>Contact 1 (conservé)</div>
        </div>
        <div />
        <div style={{
          padding: '0.65rem 1rem', borderRadius: '8px', textAlign: 'center',
          background: '#f8fafc', border: '1px solid #e2e8f0',
          fontWeight: 700, fontSize: '0.875rem',
        }}>
          {contact2.firstName} {contact2.lastName}
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>Contact 2 (sera archivé)</div>
        </div>
      </div>

      {/* Ligne par champ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {FIELDS.map(f => {
          const v1 = contact1[f.key]
          const v2 = contact2[f.key]
          const same = String(v1 ?? '') === String(v2 ?? '')
          const sel = selections[f.key]

          return (
            <div key={f.key} style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 48px 1fr',
              gap: '0.75rem', alignItems: 'center',
              padding: '0.5rem',
              borderRadius: '8px',
              background: same ? '#f8fafc' : '#fff',
              border: same ? '1px solid #f1f5f9' : '1px solid #e2e8f0',
            }}>
              {/* Label */}
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                {f.label}
                {same && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px' }}>identiques</span>}
              </div>

              {/* Valeur contact1 */}
              <button
                type="button"
                onClick={() => setSelections(s => ({ ...s, [f.key]: 'c1' }))}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: sel === 'c1' ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                  background: sel === 'c1' ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: sel === 'c1' ? 600 : 400,
                  color: sel === 'c1' ? '#1d4ed8' : '#374151',
                }}
              >
                {sel === 'c1' && <Check size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />}
                {val(contact1, f.key)}
              </button>

              {/* Flèches */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <button type="button" title="Choisir contact 1"
                  onClick={() => setSelections(s => ({ ...s, [f.key]: 'c1' }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                  <ChevronLeft size={14} />
                </button>
                <button type="button" title="Choisir contact 2"
                  onClick={() => setSelections(s => ({ ...s, [f.key]: 'c2' }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Valeur contact2 */}
              <button
                type="button"
                onClick={() => setSelections(s => ({ ...s, [f.key]: 'c2' }))}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: sel === 'c2' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: sel === 'c2' ? '#ede9fe' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: sel === 'c2' ? 600 : 400,
                  color: sel === 'c2' ? '#7c3aed' : '#374151',
                }}
              >
                {sel === 'c2' && <Check size={13} style={{ flexShrink: 0, color: '#7c3aed' }} />}
                {val(contact2, f.key)}
              </button>
            </div>
          )
        })}
      </div>

      {/* Erreur */}
      {state?.error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem' }}>
          ❌ {state.error}
        </div>
      )}

      {/* Résumé + bouton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Le contact <strong>{contact1.firstName} {contact1.lastName}</strong> sera conservé avec les valeurs sélectionnées.
          <br />
          <span style={{ color: '#ef4444' }}>Le contact <strong>{contact2.firstName} {contact2.lastName}</strong> sera archivé</span> — ses tâches, courriers et QE seront transférés.
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '0.65rem 1.5rem',
            background: isPending ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), #7c3aed)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: '1rem',
          }}
        >
          {isPending ? '⏳ Fusion en cours…' : '✅ Confirmer la fusion'}
        </button>
      </div>
    </form>
  )
}
