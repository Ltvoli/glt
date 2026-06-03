'use client'

import { useState } from 'react'
import { updateTag, deleteTag } from './actions'
import { Edit2, Trash2, Check, X } from 'lucide-react'

export default function TagList({ initialTags }: { initialTags: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState('')

  const handleEdit = (tag: any) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color || '#e2e8f0')
    setError('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setError('')
  }

  const handleSave = async (id: string) => {
    try {
      setError('')
      const res = await updateTag(id, editName, editColor)
      if (res.success) {
        setEditingId(null)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tag ? Il sera retiré de tous les contacts et tâches qui l\'utilisent.')) {
      try {
        await deleteTag(id)
      } catch (e: any) {
        alert(e.message)
      }
    }
  }

  return (
    <div>
      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Couleur</th>
            <th>Utilisation (Contacts)</th>
            <th>Utilisation (Tâches)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initialTags.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Aucun tag existant.
              </td>
            </tr>
          )}
          {initialTags.map(tag => {
            const isEditing = editingId === tag.id
            return (
              <tr key={tag.id}>
                <td>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="form-control"
                      style={{ padding: '0.25rem' }}
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{tag.name}</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={editColor} 
                        onChange={e => setEditColor(e.target.value)} 
                        style={{ padding: 0, border: 'none', width: '30px', height: '30px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{editColor}</span>
                    </div>
                  ) : (
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: tag.color || '#e2e8f0', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem',
                      color: '#1e293b'
                    }}>
                      Aperçu
                    </span>
                  )}
                </td>
                <td>{tag._count.contacts}</td>
                <td>{tag._count.tasks}</td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleSave(tag.id)} className="button" style={{ padding: '0.25rem 0.5rem' }}>
                        <Check size={16} />
                      </button>
                      <button onClick={handleCancel} className="button outline" style={{ padding: '0.25rem 0.5rem' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(tag)} className="button outline" style={{ padding: '0.25rem 0.5rem' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(tag.id)} className="button outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
