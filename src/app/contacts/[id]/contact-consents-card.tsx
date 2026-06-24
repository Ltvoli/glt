'use client'

import { useState } from 'react'
import { Check, X, Edit, ShieldAlert, History } from 'lucide-react'
import { updateContactConsents } from './actions'
import { toast } from 'sonner'

interface ConsentsCardProps {
  contactId: string
  initialConsents: {
    consentEmail: boolean | null
    consentPhone: boolean | null
    consentSms: boolean | null
    consentPostal: boolean | null
    consentCustom: boolean | null
    noContact: boolean
  }
}

export default function ContactConsentsCard({ contactId, initialConsents }: ConsentsCardProps) {
  const [consents, setConsents] = useState(initialConsents)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Local state for editing form
  const [editForm, setEditForm] = useState(initialConsents)

  const handleSave = async () => {
    setIsPending(true)
    try {
      const res = await updateContactConsents(contactId, editForm)
      if (res.success) {
        setConsents(editForm)
        setIsEditing(false)
        toast.success('Consentements mis à jour !')
      }
    } catch (e: any) {
      toast.error('Erreur: ' + e.message)
    } finally {
      setIsPending(false)
    }
  }

  const handleSetNoContact = async () => {
    if (!confirm('Êtes-vous sûr de vouloir classer ce contact en "Ne plus jamais contacter" ? Cela refusera tous les consentements par défaut.')) {
      return
    }
    const updated = {
      consentEmail: false,
      consentPhone: false,
      consentSms: false,
      consentPostal: false,
      consentCustom: false,
      noContact: true
    }
    setIsPending(true)
    try {
      const res = await updateContactConsents(contactId, updated)
      if (res.success) {
        setConsents(updated)
        setEditForm(updated)
        setIsEditing(false)
        toast.warning('Contact placé en opposition absolue.')
      }
    } catch (e: any) {
      toast.error('Erreur: ' + e.message)
    } finally {
      setIsPending(false)
    }
  }

  const renderStatus = (val: boolean | null) => {
    if (val === true) return <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><Check size={16} strokeWidth={3} /> Oui</span>
    if (val === false) return <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><X size={16} strokeWidth={3} /> Non</span>
    return <span style={{ color: '#94a3b8', fontWeight: 600 }}>--</span>
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛡️ Consentements (RGPD)
        </h2>
        {!isEditing && (
          <button
            onClick={() => { setEditForm(consents); setIsEditing(true) }}
            className="button outline"
            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Edit size={12} /> Éditer
          </button>
        )}
      </div>

      {consents.noContact && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#dc2626',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>Opposition absolue (Ne plus contacter)</span>
        </div>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { key: 'consentEmail', label: 'E-mail' },
            { key: 'consentPhone', label: 'Téléphone' },
            { key: 'consentSms', label: 'SMS' },
            { key: 'consentPostal', label: 'Postal' },
            { key: 'consentCustom', label: 'Personnalisé' }
          ].map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
              <select
                value={editForm[key as keyof typeof editForm] === null ? "" : String(editForm[key as keyof typeof editForm])}
                onChange={(e) => {
                  const val = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null
                  setEditForm(prev => ({ ...prev, [key]: val }))
                }}
                className="form-control"
                style={{ width: '130px', padding: '4px 8px', fontSize: '0.82rem' }}
              >
                <option value="">Non renseigné</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="editNoContact"
              checked={editForm.noContact}
              onChange={(e) => setEditForm(prev => ({ ...prev, noContact: e.target.checked }))}
            />
            <label htmlFor="editNoContact" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' }}>
              Ne plus jamais contacter
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              onClick={() => setIsEditing(false)}
              className="button outline"
              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="button"
              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
              disabled={isPending}
            >
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: 600, color: '#64748b' }}>Canal</th>
                <th style={{ textAlign: 'right', paddingBottom: '6px', fontWeight: 600, color: '#64748b' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'consentEmail', label: 'E-mail' },
                { key: 'consentPhone', label: 'Téléphone' },
                { key: 'consentSms', label: 'SMS' },
                { key: 'consentPostal', label: 'Courrier Postal' },
                { key: 'consentCustom', label: 'Personnalisé' }
              ].map(({ key, label }) => (
                <tr key={key} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '6px 0', color: '#334155' }}>{label}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {renderStatus(consents[key as keyof typeof consents] as boolean | null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => {
                const el = document.getElementById('history-card')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
            >
              <History size={12} /> Voir l&apos;historique
            </button>

            {!consents.noContact && (
              <button
                onClick={handleSetNoContact}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                Ne plus jamais contacter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
