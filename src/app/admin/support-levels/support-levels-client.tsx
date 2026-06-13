'use client'

import React, { useState, useTransition } from 'react'
import { 
  createSupportLevelAction, 
  updateSupportLevelAction, 
  deleteSupportLevelAction, 
  reorderSupportLevelsAction,
  applyTemplateAction
} from './actions'
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Loader2, 
  GripVertical,
  Sliders,
  Palette,
  CheckCircle2
} from 'lucide-react'

type SupportLevel = {
  id: string
  label: string
  color: string
  order: number
  isDefault: boolean
}

type SupportLevelsClientProps = {
  currentUserRole: string
  supportLevels: SupportLevel[]
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ef4444', // Red
  '#f97316', // Orange
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#94a3b8', // Gray
  '#64748b'  // Slate
]

export default function SupportLevelsClient({
  currentUserRole,
  supportLevels: initialLevels
}: SupportLevelsClientProps) {
  const [levels, setLevels] = useState<SupportLevel[]>(initialLevels)
  
  // Form State
  const [editingLevel, setEditingLevel] = useState<SupportLevel | null>(null)
  const [levelLabel, setLevelLabel] = useState('')
  const [levelColor, setLevelColor] = useState(PRESET_COLORS[0])
  const [levelIsDefault, setLevelIsDefault] = useState(false)
  
  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // Drag and drop sorting
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = levels.findIndex(item => item.id === active.id)
      const newIndex = levels.findIndex(item => item.id === over.id)
      
      const reordered = arrayMove(levels, oldIndex, newIndex)
      setLevels(reordered)
      
      startTransition(async () => {
        const res = await reorderSupportLevelsAction(reordered.map(item => item.id))
        if (res.success) {
          setSuccessBanner('Ordre des niveaux de soutien enregistré.')
        } else {
          setErrorBanner(res.error || 'Erreur lors du réordonnancement')
          // Revert
          setLevels(levels)
        }
      })
    }
  }

  // Clear Form
  const resetForm = () => {
    setEditingLevel(null)
    setLevelLabel('')
    setLevelColor(PRESET_COLORS[0])
    setLevelIsDefault(false)
  }

  // Edit action
  const startEditLevel = (level: SupportLevel) => {
    setEditingLevel(level)
    setLevelLabel(level.label)
    setLevelColor(level.color)
    setLevelIsDefault(level.isDefault)
  }

  // Save / Update Level
  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!levelLabel.trim()) return

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      if (editingLevel) {
        // Edit Support Level
        const res = await updateSupportLevelAction(editingLevel.id, levelLabel, levelColor, levelIsDefault)
        if (res.success) {
          setSuccessBanner(`Niveau "${levelLabel}" mis à jour avec succès.`)
          setLevels(prev => {
            let updated = prev.map(item => 
              item.id === editingLevel.id 
                ? { ...item, label: levelLabel.trim(), color: levelColor, isDefault: levelIsDefault } 
                : item
            )
            // If we set this one to default, others should be false
            if (levelIsDefault) {
              updated = updated.map(item => item.id !== editingLevel.id ? { ...item, isDefault: false } : item)
            }
            return updated
          })
          resetForm()
        } else {
          setErrorBanner(res.error || 'Erreur lors de la mise à jour.')
        }
      } else {
        // Create Support Level
        const res = await createSupportLevelAction(levelLabel, levelColor)
        if (res.success && res.data) {
          setSuccessBanner(`Niveau "${levelLabel}" créé avec succès.`)
          
          // Refetch levels or append
          const newLevel: SupportLevel = {
            id: res.data.id,
            label: levelLabel.trim(),
            color: levelColor,
            order: levels.length,
            isDefault: levels.length === 0 ? true : false
          }
          setLevels(prev => [...prev, newLevel])
          resetForm()
        } else {
          setErrorBanner(res.error || 'Erreur lors de la création.')
        }
      }
    })
  }

  // Delete Level
  const handleDeleteLevel = async (level: SupportLevel) => {
    setErrorBanner('')
    setSuccessBanner('')

    if (level.isDefault) {
      setErrorBanner('Impossible de supprimer le niveau de soutien par défaut.')
      return
    }

    if (!confirm(`Confirmer la suppression définitive du niveau de soutien "${level.label}" ?`)) return

    startTransition(async () => {
      const res = await deleteSupportLevelAction(level.id)
      if (res.success) {
        setSuccessBanner(`Niveau "${level.label}" supprimé.`)
        setLevels(prev => prev.filter(item => item.id !== level.id))
        if (editingLevel?.id === level.id) resetForm()
      } else {
        setErrorBanner(res.error || 'Erreur lors de la suppression.')
      }
    })
  }

  // Apply electoral template
  const handleApplyTemplate = async (templateName: 'standard' | 'electoral' | 'engagement') => {
    setErrorBanner('')
    setSuccessBanner('')

    if (!confirm('Attention : Appliquer un modèle écrasera tous vos niveaux de soutien actuels. Confirmer ?')) return

    startTransition(async () => {
      const res = await applyTemplateAction(templateName)
      if (res.success) {
        setSuccessBanner('Modèle appliqué avec succès.')
        // Reload page data by window refresh, or we could also query it.
        // A simple reload is extremely clean for templates to align order, defaults and count.
        window.location.reload()
      } else {
        setErrorBanner(res.error || 'Erreur lors de l\'application du modèle.')
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

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Levels list with DND */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
              Niveaux de soutien configurés
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {levels.length} niveau(x)
            </span>
          </div>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', margin: '0 0 1.25rem 0' }}>
            Glissez-déposez les poignées pour ordonner la hiérarchie des niveaux de soutien. Le niveau par défaut est affecté automatiquement aux nouveaux contacts créés.
          </p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={levels.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {levels.map(level => (
                <SortableLevelItem 
                  key={level.id} 
                  level={level} 
                  onEdit={startEditLevel} 
                  onDelete={handleDeleteLevel}
                  isPending={isPending}
                />
              ))}
            </SortableContext>
          </DndContext>

          {levels.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              Aucun niveau de soutien configuré. Utilisez un modèle à droite ou créez-en un.
            </div>
          )}
        </div>

        {/* Right Side: Form & Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Create / Edit Form */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editingLevel ? 'Modifier le niveau' : 'Ajouter un niveau'}</span>
              {editingLevel && (
                <button 
                  onClick={resetForm} 
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveLevel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Libellé du niveau
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  required
                  placeholder="Ex: Favorable, Éloigné, Très Fort"
                  value={levelLabel}
                  onChange={e => setLevelLabel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Couleur associée
                </label>
                
                {/* Grid of presets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setLevelColor(color)}
                      style={{
                        height: '28px',
                        backgroundColor: color,
                        border: levelColor === color ? '2px solid black' : '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: levelColor === color ? '0 0 0 2px white inset' : 'none'
                      }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Color pickers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={levelColor}
                    onChange={e => setLevelColor(e.target.value)}
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
                    value={levelColor}
                    onChange={e => setLevelColor(e.target.value)}
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem', 
                      height: '32px',
                      flex: 1
                    }}
                  />
                </div>
              </div>

              {/* Set Default Toggle */}
              <div className="form-group" style={{ marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={levelIsDefault}
                    onChange={e => setLevelIsDefault(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Définir par défaut</span>
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.725rem', margin: '0.25rem 0 0 1.25rem' }}>
                  Si coché, les nouveaux fiches contacts recevront ce niveau de soutien par défaut. Un seul niveau par défaut est possible.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {editingLevel && (
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
                  {editingLevel ? 'Sauvegarder' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>

          {/* Templates Selector Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} style={{ color: 'var(--primary)' }} />
              Modèles prédéfinis
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.25rem 0' }}>
              Choisissez un modèle de départ pour écraser et pré-remplir votre hiérarchie de niveaux de soutien :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleApplyTemplate('standard')}
                disabled={isPending}
                className="button outline"
                style={{ 
                  textAlign: 'left', 
                  padding: '0.75rem 1rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  alignItems: 'flex-start',
                  height: 'auto'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--foreground)' }}>Modèle Standard (3 niveaux)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Faible (Gris), Moyen (Bleu), Fort (Vert)</span>
              </button>

              <button
                onClick={() => handleApplyTemplate('electoral')}
                disabled={isPending}
                className="button outline"
                style={{ 
                  textAlign: 'left', 
                  padding: '0.75rem 1rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  alignItems: 'flex-start',
                  height: 'auto'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--foreground)' }}>Modèle Électoral (4 niveaux)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opposant, Indécis, Favorable, Militant</span>
              </button>

              <button
                onClick={() => handleApplyTemplate('engagement')}
                disabled={isPending}
                className="button outline"
                style={{ 
                  textAlign: 'left', 
                  padding: '0.75rem 1rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem',
                  alignItems: 'flex-start',
                  height: 'auto'
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--foreground)' }}>Modèle Engagement (4 niveaux)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Observateur, Sympathisant, Adhérent, Militant Actif</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

type SortableLevelItemProps = {
  level: SupportLevel
  onEdit: (level: SupportLevel) => void
  onDelete: (level: SupportLevel) => void
  isPending: boolean
}

function SortableLevelItem({ level, onEdit, onDelete, isPending }: SortableLevelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: level.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: 'white',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    gap: '1rem',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
    zIndex: isDragging ? 2 : 1
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Grab Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        style={{ 
          cursor: 'grab', 
          display: 'flex', 
          alignItems: 'center', 
          color: 'var(--text-muted)',
          padding: '0.25rem'
        }}
      >
        <GripVertical size={16} />
      </div>

      {/* Main Details */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Color preview circle */}
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: level.color,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
          }} />
          
          <span style={{ fontWeight: '600', fontSize: '0.925rem', color: 'var(--foreground)' }}>
            {level.label}
          </span>

          {level.isDefault && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.7rem',
              backgroundColor: '#e6f4ea',
              color: '#137333',
              padding: '0.125rem 0.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              border: '1px solid #c2e7c9'
            }}>
              <CheckCircle2 size={10} /> Par défaut
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="button outline"
            style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
            onClick={() => onEdit(level)}
            disabled={isPending}
          >
            <Edit2 size={12} />
          </button>
          
          <button
            type="button"
            className="button danger outline"
            style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem', opacity: level.isDefault ? 0.4 : 1 }}
            onClick={() => onDelete(level)}
            disabled={isPending || level.isDefault}
            title={level.isDefault ? 'Impossible de supprimer le niveau par défaut' : 'Supprimer'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
