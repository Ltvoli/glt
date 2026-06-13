'use client'

import React, { useState, useTransition } from 'react'
import { 
  createTagAction, 
  updateTagAction, 
  deleteTagAction, 
  deleteTagsBulkAction 
} from './actions'
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle,
  Tag as TagIcon
} from 'lucide-react'

type Tag = {
  id: string
  name: string
  color: string
  usageCount: number
  contactsCount: number
  tasksCount: number
}

type TagsClientProps = {
  currentUserRole: string
  tags: Tag[]
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#64748b'  // Slate
]

export default function TagsClient({
  currentUserRole,
  tags: initialTags
}: TagsClientProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Create / Edit Form State
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0])
  
  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  // Filters
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredTags.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectTag = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  // Clear Form
  const resetForm = () => {
    setEditingTag(null)
    setTagName('')
    setTagColor(PRESET_COLORS[0])
  }

  // Save / Update Tag
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      if (editingTag) {
        // Edit Tag
        const res = await updateTagAction(editingTag.id, tagName, tagColor)
        if (res.success) {
          setSuccessBanner(`Tag "${tagName}" mis à jour avec succès.`)
          setTags(prev => prev.map(t => 
            t.id === editingTag.id 
              ? { ...t, name: tagName.trim(), color: tagColor } 
              : t
          ))
          resetForm()
        } else {
          setErrorBanner(res.error || 'Erreur lors de la mise à jour.')
        }
      } else {
        // Create Tag
        const res = await createTagAction(tagName, tagColor)
        if (res.success && res.data) {
          setSuccessBanner(`Tag "${tagName}" créé avec succès.`)
          const newTag: Tag = {
            id: res.data.id,
            name: tagName.trim(),
            color: tagColor,
            usageCount: 0,
            contactsCount: 0,
            tasksCount: 0
          }
          setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
          resetForm()
        } else {
          setErrorBanner(res.error || 'Erreur lors de la création.')
        }
      }
    })
  }

  // Set Tag for Editing
  const startEditTag = (tag: Tag) => {
    setEditingTag(tag)
    setTagName(tag.name)
    setTagColor(tag.color)
  }

  // Delete single tag
  const handleDeleteTag = async (tag: Tag) => {
    setErrorBanner('')
    setSuccessBanner('')

    const totalUsage = tag.contactsCount + tag.tasksCount
    const warningMsg = totalUsage > 0 
      ? `Attention : Ce tag est associé à ${tag.contactsCount} contact(s) et ${tag.tasksCount} tâche(s). Voulez-vous vraiment le supprimer définitivement ?`
      : `Voulez-vous vraiment supprimer le tag "${tag.name}" ?`

    if (!confirm(warningMsg)) return

    startTransition(async () => {
      const res = await deleteTagAction(tag.id)
      if (res.success) {
        setSuccessBanner(`Tag "${tag.name}" supprimé.`)
        setTags(prev => prev.filter(t => t.id !== tag.id))
        setSelectedIds(prev => prev.filter(id => id !== tag.id))
        if (editingTag?.id === tag.id) resetForm()
      } else {
        setErrorBanner(res.error || 'Erreur lors de la suppression.')
      }
    })
  }

  // Bulk Delete
  const handleBulkDelete = async () => {
    setErrorBanner('')
    setSuccessBanner('')

    const selectedTags = tags.filter(t => selectedIds.includes(t.id))
    const totalUsage = selectedTags.reduce((sum, t) => sum + t.contactsCount + t.tasksCount, 0)
    
    const warningMsg = totalUsage > 0 
      ? `Attention : Les tags sélectionnés sont associés à ${totalUsage} élément(s) au total. Les supprimer rompra ces associations. Confirmer la suppression groupée de ${selectedIds.length} tags ?`
      : `Voulez-vous vraiment supprimer les ${selectedIds.length} tags sélectionnés ?`

    if (!confirm(warningMsg)) return

    startTransition(async () => {
      const res = await deleteTagsBulkAction(selectedIds)
      if (res.success) {
        setSuccessBanner(`${selectedIds.length} tags supprimés avec succès.`)
        setTags(prev => prev.filter(t => !selectedIds.includes(t.id)))
        setSelectedIds([])
        if (editingTag && selectedIds.includes(editingTag.id)) resetForm()
      } else {
        setErrorBanner(res.error || 'Erreur lors de la suppression groupée.')
      }
    })
  }

  return (
    <div>
      {/* Alerts */}
      {successBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <Check size={18} /> {successBanner}
        </div>
      )}
      {errorBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <X size={18} /> {errorBanner}
        </div>
      )}

      {/* Main Grid: List left, form right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Tag List */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
              Gestion des Tags
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {filteredTags.length} tag(s)
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control"
              style={{ paddingLeft: '2.25rem', height: '36px' }}
              placeholder="Rechercher un tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Bulk actions header */}
          {selectedIds.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.75rem 1rem', 
              backgroundColor: '#f1f5f9', 
              borderRadius: '6px', 
              marginBottom: '1rem',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--foreground)' }}>
                {selectedIds.length} sélectionné(s)
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={isPending}
                className="button danger"
                style={{ height: '28px', padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
              >
                <Trash2 size={14} /> Supprimer la sélection
              </button>
            </div>
          )}

          {/* Tags Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: '40px', padding: '0.5rem' }}>
                    <input 
                      type="checkbox"
                      checked={filteredTags.length > 0 && selectedIds.length === filteredTags.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Nom</th>
                  <th>Couleur</th>
                  <th style={{ textAlign: 'center' }}>Utilisation</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      Aucun tag disponible
                    </td>
                  </tr>
                ) : (
                  filteredTags.map(tag => {
                    const totalUsage = tag.contactsCount + tag.tasksCount
                    
                    return (
                      <tr key={tag.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(tag.id)}
                            onChange={e => handleSelectTag(tag.id, e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>
                            <TagIcon size={14} style={{ color: tag.color }} />
                            {tag.name}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              backgroundColor: tag.color 
                            }} />
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {tag.color}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span 
                            style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: '600',
                              backgroundColor: totalUsage > 0 ? 'var(--primary-light)' : '#f1f5f9',
                              color: totalUsage > 0 ? 'var(--primary)' : 'var(--text-muted)',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '12px'
                            }}
                            title={`Contacts: ${tag.contactsCount} | Tâches: ${tag.tasksCount}`}
                          >
                            {totalUsage}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => startEditTag(tag)}
                              className="button outline"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
                              title="Modifier"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteTag(tag)}
                              className="button danger outline"
                              style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
                              title="Supprimer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Form (Create/Edit) */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{editingTag ? 'Modifier le tag' : 'Créer un tag'}</span>
            {editingTag && (
              <button 
                onClick={resetForm} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            )}
          </h3>

          <form onSubmit={handleSaveTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Nom du tag
              </label>
              <input 
                type="text" 
                className="form-control"
                required
                placeholder="Ex: Urgent, Élu, Presse"
                value={tagName}
                onChange={e => setTagName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Palette de couleurs
              </label>
              
              {/* Grid of presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    style={{
                      height: '28px',
                      backgroundColor: color,
                      border: tagColor === color ? '2px solid black' : '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: tagColor === color ? '0 0 0 2px white inset' : 'none'
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom hex picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="color" 
                  value={tagColor}
                  onChange={e => setTagColor(e.target.value)}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: 0,
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer'
                  }}
                />
                <input 
                  type="text" 
                  className="form-control"
                  value={tagColor}
                  onChange={e => setTagColor(e.target.value)}
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem', 
                    height: '32px',
                    flex: 1
                  }}
                />
              </div>
            </div>

            {editingTag && (editingTag.contactsCount + editingTag.tasksCount > 0) && (
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                padding: '0.75rem', 
                backgroundColor: '#fffbeb', 
                border: '1px solid #fef3c7', 
                borderRadius: '6px',
                color: '#b45309',
                fontSize: '0.75rem'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  Ce tag est utilisé {editingTag.contactsCount + editingTag.tasksCount} fois. 
                  Modifier son nom affectera tous ces éléments.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {editingTag && (
                <button 
                  type="button" 
                  className="button outline" 
                  style={{ flex: 1, height: '36px' }}
                  onClick={resetForm}
                >
                  Annuler
                </button>
              )}
              <button 
                type="submit" 
                disabled={isPending}
                className="button"
                style={{ flex: 1, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingTag ? 'Sauvegarder' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
