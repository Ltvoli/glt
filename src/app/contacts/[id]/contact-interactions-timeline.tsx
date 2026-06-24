'use client'

import { useState } from 'react'
import { Phone, PhoneCall, MessageSquare, Users, Plus, Calendar, Clock, Trash } from 'lucide-react'
import { createContactInteraction } from './actions'
import { toast } from 'sonner'

interface Interaction {
  id: string
  type: string
  date: Date | string
  notes: string | null
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface TimelineProps {
  contactId: string
  initialInteractions: Interaction[]
}

const TYPE_DEFS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  APPEL_ENTRANT:     { label: 'Appel entrant', icon: <PhoneCall size={14} />, color: '#0ea5e9', bg: '#e0f2fe' },
  APPEL_SORTANT:     { label: 'Appel sortant', icon: <Phone size={14} />, color: '#10b981', bg: '#d1fae5' },
  RENCONTRE_PHYSIQUE: { label: 'Rencontre physique', icon: <Users size={14} />, color: '#8b5cf6', bg: '#ede9fe' },
  SMS:               { label: 'SMS', icon: <MessageSquare size={14} />, color: '#f59e0b', bg: '#fef3c7' }
}

export default function ContactInteractionsTimeline({ contactId, initialInteractions = [] }: TimelineProps) {
  const [interactions, setInteractions] = useState<Interaction[]>(initialInteractions)
  const [showAddForm, setShowAddForm] = useState(false)
  const [type, setType] = useState('APPEL_SORTANT')
  const [notes, setNotes] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type) {
      toast.error('Veuillez sélectionner un type d\'interaction.')
      return
    }
    setIsPending(true)
    try {
      const res = await createContactInteraction(contactId, type, notes)
      
      // Since it revalidates, but we are a client component maintaining local state or waiting for server prop update:
      // We can prepend the new interaction to the list locally:
      const newInteraction: Interaction = {
        id: res.id,
        type: res.type,
        date: new Date(),
        notes: res.notes,
        createdBy: {
          firstName: 'Moi', // Fallback display name until refresh
          lastName: ''
        }
      }
      setInteractions([newInteraction, ...interactions])
      setNotes('')
      setShowAddForm(false)
      toast.success('Interaction enregistrée avec succès !')
    } catch (err: any) {
      toast.error('Erreur lors de la création : ' + err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          💬 Interactions
          <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
            {interactions.length}
          </span>
        </h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="button outline"
            style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={12} /> Log interaction
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label htmlFor="interactionType" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Type d&apos;interaction
              </label>
              <select
                id="interactionType"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
                required
              >
                <option value="APPEL_SORTANT">📞 Appel sortant</option>
                <option value="APPEL_ENTRANT">📥 Appel entrant</option>
                <option value="RENCONTRE_PHYSIQUE">🤝 Rencontre physique</option>
                <option value="SMS">💬 SMS</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="interactionNotes" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Notes / Compte-rendu
              </label>
              <textarea
                id="interactionNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-control"
                rows={3}
                placeholder="Détails de la conversation, décisions prises..."
                style={{ fontSize: '0.875rem', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="button outline"
              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="button"
              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
              disabled={isPending}
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {interactions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute',
            left: '17px',
            top: '10px',
            bottom: '10px',
            width: '2px',
            background: '#e2e8f0',
            zIndex: 0
          }} />

          {interactions.map((inter) => {
            const def = TYPE_DEFS[inter.type] || { label: inter.type, icon: <Clock size={14} />, color: '#64748b', bg: '#f1f5f9' }
            const dateObj = typeof inter.date === 'string' ? new Date(inter.date) : inter.date
            return (
              <div key={inter.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                {/* Timeline dot/icon */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: def.bg,
                  color: def.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 0 4px white',
                  border: `1px solid ${def.color}22`
                }}>
                  {def.icon}
                </div>

                {/* Content card */}
                <div style={{
                  flex: 1,
                  padding: '0.75rem 0.9rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      {def.label}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} />
                      {dateObj.toLocaleDateString('fr-FR')} à {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {inter.notes && (
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 6px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {inter.notes}
                    </p>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Enregistré par {inter.createdBy.firstName} {inter.createdBy.lastName}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          Aucune interaction enregistrée pour ce contact.
        </div>
      )}
    </div>
  )
}
