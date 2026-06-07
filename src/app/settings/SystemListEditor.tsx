'use client'

import { useState, useActionState } from 'react'
import { createSystemList, updateSystemList, deleteSystemList } from './system-list-actions'
import { Edit2, Trash2, Check, X, Plus } from 'lucide-react'

const initialCreateState = { error: '', success: false }
const initialUpdateState = { error: '', success: false }

export default function SystemListEditor({
  title,
  description,
  category,
  items,
  hasColors = false
}: {
  title: string
  description?: string
  category: string
  items: any[]
  hasColors?: boolean
}) {
  const [createState, createAction, isCreating] = useActionState(createSystemList, initialCreateState)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h3>
      {description && <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{description}</p>}

      {/* Formulaire d'ajout */}
      <form action={createAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <input type="hidden" name="category" value={category} />
        <div style={{ flex: 1 }}>
          <input type="text" name="value" className="form-control" placeholder="Nouvelle valeur..." required />
        </div>
        {hasColors && (
          <div style={{ width: '100px' }}>
            <input type="color" name="color" className="form-control" defaultValue="#4f46e5" style={{ padding: '0 0.5rem' }} />
          </div>
        )}
        <div style={{ width: '80px' }}>
          <input type="number" name="order" className="form-control" placeholder="Ordre" defaultValue="0" />
        </div>
        <button type="submit" className="button" disabled={isCreating} style={{ padding: '0.5rem 1rem' }}>
          <Plus size={18} /> Ajouter
        </button>
      </form>
      {createState.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '-1.5rem', marginBottom: '1.5rem' }}>{createState.error}</p>}

      {/* Liste existante */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Aucun élément pour l'instant.</p>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              {editingId === item.id ? (
                <EditRow item={item} hasColors={hasColors} onCancel={() => setEditingId(null)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', width: '20px' }}>{item.order}</span>
                    {hasColors && item.color && (
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }} />
                    )}
                    <span style={{ fontWeight: 500, textDecoration: item.isActive ? 'none' : 'line-through', opacity: item.isActive ? 1 : 0.5 }}>
                      {item.value}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setEditingId(item.id)} className="button-icon" title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Voulez-vous vraiment supprimer cet élément ? (S\'il est déjà utilisé, cela peut causer des erreurs. Privilégiez sa modification en le passant Inactif).')) {
                          await deleteSystemList(item.id)
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

function EditRow({ item, hasColors, onCancel }: { item: any, hasColors: boolean, onCancel: () => void }) {
  const [state, formAction, isUpdating] = useActionState(updateSystemList, initialUpdateState)

  return (
    <form action={formAction} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <input type="hidden" name="id" value={item.id} />
      
      <div style={{ width: '60px' }}>
        <input type="number" name="order" className="form-control" defaultValue={item.order} title="Ordre" style={{ padding: '0.25rem 0.5rem', height: '32px' }} />
      </div>
      
      {hasColors && (
        <div style={{ width: '50px' }}>
          <input type="color" name="color" className="form-control" defaultValue={item.color || '#cccccc'} style={{ padding: '0', height: '32px', width: '100%' }} />
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        <input type="text" name="value" className="form-control" defaultValue={item.value} required style={{ padding: '0.25rem 0.5rem', height: '32px' }} />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <input type="checkbox" id={`isActive-${item.id}`} name="isActive" value="true" defaultChecked={item.isActive} />
        <label htmlFor={`isActive-${item.id}`} style={{ margin: 0, fontSize: '0.75rem' }}>Actif</label>
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
