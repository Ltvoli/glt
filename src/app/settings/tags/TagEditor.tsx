'use client'

import { useState, useActionState } from 'react'
import { createTag, updateTag, deleteTag } from './tag-actions'
import { Edit2, Trash2, Check, X, Plus } from 'lucide-react'

const initialCreateState: any = { error: '', success: false }
const initialUpdateState: any = { error: '', success: false }

export default function TagEditor({ tags }: { tags: any[] }) {
  const [createState, createAction, isCreating] = useActionState(createTag, initialCreateState)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Formulaire d'ajout */}
      <form action={createAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <input type="text" name="name" className="form-control" placeholder="Nouveau Tag..." required />
        </div>
        <div style={{ width: '80px' }}>
          <input type="color" name="color" className="form-control" defaultValue="#4f46e5" style={{ padding: '0 0.5rem' }} />
        </div>
        <button type="submit" className="button" disabled={isCreating} style={{ padding: '0.5rem 1rem' }}>
          <Plus size={18} /> Créer
        </button>
      </form>
      {createState.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '-1.5rem', marginBottom: '1.5rem' }}>{createState.error}</p>}

      {/* Liste existante */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {tags.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Aucun tag trouvé.</p>
        ) : (
          tags.map(tag => (
            <div key={tag.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              {editingId === tag.id ? (
                <EditTagRow tag={tag} onCancel={() => setEditingId(null)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span 
                      style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        backgroundColor: `${tag.color}20`, 
                        color: tag.color,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {tag.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Utilisé dans : {tag._count.contacts} contact(s), {tag._count.tasks} tâche(s)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setEditingId(tag.id)} className="button-icon" title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm(`Voulez-vous vraiment supprimer le tag "${tag.name}" ? Il sera retiré de tous les contacts et tâches qui l'utilisent.`)) {
                          await deleteTag(tag.id)
                        }
                      }} 
                      className="button-icon" style={{ color: 'var(--danger)' }} title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EditTagRow({ tag, onCancel }: { tag: any, onCancel: () => void }) {
  const [state, formAction, isUpdating] = useActionState(updateTag, initialUpdateState)

  return (
    <form action={formAction} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <input type="hidden" name="id" value={tag.id} />
      
      <div style={{ width: '80px' }}>
        <input type="color" name="color" className="form-control" defaultValue={tag.color || '#cccccc'} style={{ padding: '0', height: '36px', width: '100%' }} />
      </div>
      
      <div style={{ flex: 1 }}>
        <input type="text" name="name" className="form-control" defaultValue={tag.name} required style={{ height: '36px' }} />
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
        <button type="submit" className="button-icon" style={{ color: 'var(--success)' }} disabled={isUpdating} title="Valider">
          <Check size={18} />
        </button>
        <button type="button" onClick={onCancel} className="button-icon" style={{ color: 'var(--danger)' }} disabled={isUpdating} title="Annuler">
          <X size={18} />
        </button>
      </div>
    </form>
  )
}
