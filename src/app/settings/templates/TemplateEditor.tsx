'use client'

import { useState, useActionState } from 'react'
import { saveTemplate, deleteTemplate } from './template-actions'
import { Edit2, Trash2, Plus, Mail, MessageSquare, Phone } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function TemplateEditor({ templates }: { templates: any[] }) {
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          className="button" 
          onClick={() => { setIsCreating(true); setEditingTemplate(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Créer un modèle
        </button>
      </div>

      {(isCreating || editingTemplate) && (
        <TemplateForm 
          template={editingTemplate} 
          onCancel={() => { setIsCreating(false); setEditingTemplate(null) }} 
        />
      )}

      {!isCreating && !editingTemplate && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {templates.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aucun modèle enregistré.</p>
          ) : (
            templates.map(t => (
              <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TypeIcon type={t.type} />
                    <h4 style={{ fontWeight: 600, margin: 0 }}>{t.name}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setEditingTemplate(t)} className="button-icon" title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Voulez-vous vraiment supprimer ce modèle ?')) await deleteTemplate(t.id)
                      }} 
                      className="button-icon" style={{ color: 'var(--danger)' }} title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {t.subject && <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Sujet: {t.subject}</p>}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {t.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'EMAIL': return <Mail size={18} style={{ color: 'var(--primary)' }} />
    case 'SMS': return <MessageSquare size={18} style={{ color: '#0ea5e9' }} />
    case 'WHATSAPP': return <Phone size={18} style={{ color: '#22c55e' }} />
    default: return <Mail size={18} />
  }
}

function TemplateForm({ template, onCancel }: { template?: any, onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState(saveTemplate, initialState)
  const [type, setType] = useState(template?.type || 'EMAIL')

  return (
    <form action={formAction} className="card" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        {template ? 'Modifier le modèle' : 'Nouveau modèle'}
      </h3>
      
      {template && <input type="hidden" name="id" value={template.id} />}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="name">Nom du modèle *</label>
          <input type="text" id="name" name="name" className="form-control" defaultValue={template?.name} required placeholder="Ex: Invitation Voeux" />
        </div>
        <div className="form-group">
          <label htmlFor="type">Type de message *</label>
          <select id="type" name="type" className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="EMAIL">E-mail</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
      </div>

      {type === 'EMAIL' && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="subject">Sujet de l'e-mail</label>
          <input type="text" id="subject" name="subject" className="form-control" defaultValue={template?.subject} placeholder="Sujet du message..." />
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="content">Contenu du message *</label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Variables disponibles : {"{{prenom}}"}, {"{{nom}}"}, {"{{civilite}}"}
        </p>
        <textarea 
          id="content" 
          name="content" 
          className="form-control" 
          rows={type === 'EMAIL' ? 10 : 4} 
          defaultValue={template?.content} 
          required 
          placeholder="Rédigez votre message ici..."
        ></textarea>
      </div>

      {state.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>Modèle enregistré avec succès.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="button" className="button-outline" onClick={onCancel} disabled={isPending}>Annuler</button>
        <button type="submit" className="button" disabled={isPending}>{isPending ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
