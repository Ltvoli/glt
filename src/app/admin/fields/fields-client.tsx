'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { FieldConfigInput, initializeModuleFieldsAction, updateFieldsAction } from './actions'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Save, RotateCcw, Smartphone, MonitorSmartphone, Loader2, GripVertical, ChevronDown, ChevronRight, Check } from 'lucide-react'

const DEFAULT_CONTACTS_FIELDS: Omit<FieldConfigInput, 'id'>[] = [
  // État civil
  { module: 'contacts', section: 'État civil', fieldKey: 'gender', defaultLabel: 'Genre', customLabel: null, isVisible: true, order: 0 },
  { module: 'contacts', section: 'État civil', fieldKey: 'firstName', defaultLabel: 'Prénom', customLabel: null, isVisible: true, order: 1 },
  { module: 'contacts', section: 'État civil', fieldKey: 'lastName', defaultLabel: 'Nom', customLabel: null, isVisible: true, order: 2 },
  { module: 'contacts', section: 'État civil', fieldKey: 'birthDate', defaultLabel: 'Date de naissance', customLabel: null, isVisible: true, order: 3 },
  { module: 'contacts', section: 'État civil', fieldKey: 'usageName', defaultLabel: 'Nom d\'usage', customLabel: null, isVisible: false, order: 4 },
  { module: 'contacts', section: 'État civil', fieldKey: 'nationality', defaultLabel: 'Nationalité', customLabel: null, isVisible: false, order: 5 },

  // Adresse
  { module: 'contacts', section: 'Adresse', fieldKey: 'building', defaultLabel: 'Bâtiment', customLabel: null, isVisible: true, order: 6 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'streetNumber', defaultLabel: 'Numéro', customLabel: null, isVisible: true, order: 7 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'streetName', defaultLabel: 'Rue / Voie', customLabel: null, isVisible: true, order: 8 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'postalCode', defaultLabel: 'Code postal', customLabel: null, isVisible: true, order: 9 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'city', defaultLabel: 'Ville', customLabel: null, isVisible: true, order: 10 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'buildingType', defaultLabel: 'Type de bâtiment', customLabel: null, isVisible: false, order: 11 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'floor', defaultLabel: 'Étage', customLabel: null, isVisible: false, order: 12 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'door', defaultLabel: 'Porte', customLabel: null, isVisible: false, order: 13 },
]

const DEFAULT_TASKS_FIELDS: Omit<FieldConfigInput, 'id'>[] = [
  { module: 'tasks', section: 'Informations', fieldKey: 'title', defaultLabel: 'Titre de la tâche', customLabel: null, isVisible: true, order: 0 },
  { module: 'tasks', section: 'Informations', fieldKey: 'description', defaultLabel: 'Description', customLabel: null, isVisible: true, order: 1 },
  { module: 'tasks', section: 'Informations', fieldKey: 'expectedDeliverable', defaultLabel: 'Livrable attendu', customLabel: null, isVisible: true, order: 2 },
  { module: 'tasks', section: 'Informations', fieldKey: 'tags', defaultLabel: 'Tags', customLabel: null, isVisible: true, order: 3 },
  { module: 'tasks', section: 'Planification', fieldKey: 'priority', defaultLabel: 'Priorité', customLabel: null, isVisible: true, order: 4 },
  { module: 'tasks', section: 'Planification', fieldKey: 'status', defaultLabel: 'Statut', customLabel: null, isVisible: true, order: 5 },
  { module: 'tasks', section: 'Planification', fieldKey: 'assigneeId', defaultLabel: 'Assigner à', customLabel: null, isVisible: true, order: 6 },
  { module: 'tasks', section: 'Planification', fieldKey: 'dueDate', defaultLabel: 'Échéance', customLabel: null, isVisible: true, order: 7 },
]

const DEFAULT_MAILS_FIELDS: Omit<FieldConfigInput, 'id'>[] = [
  { module: 'mailcases', section: 'Informations', fieldKey: 'subject', defaultLabel: 'Sujet du courrier', customLabel: null, isVisible: true, order: 0 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'type', defaultLabel: 'Type', customLabel: null, isVisible: true, order: 1 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'channel', defaultLabel: 'Canal', customLabel: null, isVisible: true, order: 2 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'category', defaultLabel: 'Catégorie', customLabel: null, isVisible: true, order: 3 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'urgency', defaultLabel: 'Urgence', customLabel: null, isVisible: true, order: 4 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'content', defaultLabel: 'Contenu', customLabel: null, isVisible: true, order: 5 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'notes', defaultLabel: 'Notes', customLabel: null, isVisible: true, order: 6 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'senderName', defaultLabel: 'Nom de l\'expéditeur', customLabel: null, isVisible: true, order: 7 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'recipientName', defaultLabel: 'Nom du destinataire', customLabel: null, isVisible: true, order: 8 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'city', defaultLabel: 'Ville', customLabel: null, isVisible: true, order: 9 },
  { module: 'mailcases', section: 'Planification', fieldKey: 'responseDueDate', defaultLabel: 'Échéance de réponse', customLabel: null, isVisible: true, order: 10 },
  { module: 'mailcases', section: 'Planification', fieldKey: 'assigneeId', defaultLabel: 'Assigner à', customLabel: null, isVisible: true, order: 11 },
]

const DEFAULT_QE_FIELDS: Omit<FieldConfigInput, 'id'>[] = [
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'anNumber', defaultLabel: 'Numéro de question AN', customLabel: null, isVisible: true, order: 0 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'title', defaultLabel: 'Titre de la question', customLabel: null, isVisible: true, order: 1 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'type', defaultLabel: 'Type', customLabel: null, isVisible: true, order: 2 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'ministry', defaultLabel: 'Ministère ciblé', customLabel: null, isVisible: true, order: 3 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'theme', defaultLabel: 'Thème', customLabel: null, isVisible: true, order: 4 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'content', defaultLabel: 'Texte de la question', customLabel: null, isVisible: true, order: 5 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'notes', defaultLabel: 'Notes internes', customLabel: null, isVisible: true, order: 6 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'author', defaultLabel: 'Auteur', customLabel: null, isVisible: false, order: 7 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'coSigners', defaultLabel: 'Co-signataires', customLabel: null, isVisible: false, order: 8 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'depositDate', defaultLabel: 'Date de dépôt', customLabel: null, isVisible: true, order: 9 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'responseDate', defaultLabel: 'Date de réponse', customLabel: null, isVisible: true, order: 10 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'concernedPerson', defaultLabel: 'Personne concernée', customLabel: null, isVisible: false, order: 11 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'followUpDueDate', defaultLabel: 'Échéance de relance', customLabel: null, isVisible: true, order: 12 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'responseContent', defaultLabel: 'Contenu de la réponse', customLabel: null, isVisible: true, order: 13 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'assigneeId', defaultLabel: 'Assigné à', customLabel: null, isVisible: true, order: 14 },
]

const DEFAULT_PERMANENCES_FIELDS: Omit<FieldConfigInput, 'id'>[] = [
  { module: 'permanences', section: 'Général', fieldKey: 'title', defaultLabel: 'Titre de la permanence', customLabel: null, isVisible: true, order: 0 },
  { module: 'permanences', section: 'Général', fieldKey: 'status', defaultLabel: 'Statut', customLabel: null, isVisible: true, order: 1 },
  { module: 'permanences', section: 'Général', fieldKey: 'scheduledStartDate', defaultLabel: 'Date prévue', customLabel: null, isVisible: true, order: 2 },
  { module: 'permanences', section: 'Général', fieldKey: 'ownerUserId', defaultLabel: 'Responsable', customLabel: null, isVisible: true, order: 3 },
  { module: 'permanences', section: 'Général', fieldKey: 'notes', defaultLabel: 'Notes de préparation', customLabel: null, isVisible: true, order: 4 },
  { module: 'permanences', section: 'Général', fieldKey: 'deputyRemarks', defaultLabel: 'Remarques du député', customLabel: null, isVisible: true, order: 5 },
]

function SortableFieldRow({ 
  field, 
  onChangeLabel, 
  onToggleVisible, 
  onResetLabel 
}: { 
  field: FieldConfigInput
  onChangeLabel: (id: string, val: string) => void
  onToggleVisible: (id: string) => void
  onResetLabel: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
  const displayLabel = field.customLabel ?? field.defaultLabel

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform), transition,
      opacity: isDragging ? 0.4 : 1,
      display: 'grid', gridTemplateColumns: '180px 1fr 60px 140px 60px', alignItems: 'center', gap: '1rem',
      padding: '1rem 0',
      borderBottom: '1px solid #f1f5f9',
      background: isDragging ? '#f8fafc' : 'transparent',
      position: 'relative',
      zIndex: isDragging ? 10 : 1
    }}>
      {/* 1. Label de base + Poignée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1', display: 'flex' }}>
          <GripVertical size={16} />
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{field.defaultLabel}</span>
      </div>

      {/* 2. Input personnalisation */}
      <div>
        <input 
          type="text" 
          value={displayLabel} 
          onChange={(e) => onChangeLabel(field.id, e.target.value)}
          style={{
            width: '100%', maxWidth: '300px',
            padding: '0.6rem 0.8rem',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            fontSize: '0.85rem', color: '#1e293b', outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {/* 3. Reset Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={() => onResetLabel(field.id)}
          disabled={!field.customLabel}
          style={{
            background: 'none', border: 'none', cursor: field.customLabel ? 'pointer' : 'default',
            color: field.customLabel ? '#94a3b8' : '#e2e8f0', padding: '0.5rem',
            transition: 'color 0.15s'
          }}
          title="Réinitialiser le libellé"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* 4. Switch Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 500, color: field.isVisible ? '#334155' : '#94a3b8' }}>
          {field.isVisible ? 'Affiché' : 'Masqué'}
        </span>
        <button 
          onClick={() => onToggleVisible(field.id)}
          style={{
            width: '38px', height: '22px', borderRadius: '11px',
            background: field.isVisible ? '#ec4899' : '#e2e8f0', // Pink/Rose theme like the screenshot
            position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
          }}
        >
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
            position: 'absolute', top: '2px', left: field.isVisible ? '18px' : '2px',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }} />
        </button>
      </div>

      {/* 5. Mobile Icon (Visual Only) */}
      <div style={{ display: 'flex', justifyContent: 'center', color: '#94a3b8' }}>
        {field.isVisible ? <MonitorSmartphone size={18} /> : <Smartphone size={18} opacity={0.5} />}
      </div>
    </div>
  )
}

export default function FieldsClient({ initialFields }: { initialFields: FieldConfigInput[] }) {
  const [fields, setFields] = useState<FieldConfigInput[]>(initialFields)
  const [activeModule, setActiveModule] = useState('contacts')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'État civil': true,
    'Adresse': true
  })
  
  const [isPendingInit, startInitTransition] = useTransition()
  const [isPendingSave, startSaveTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)
  const [successBanner, setSuccessBanner] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Mapping of default fields for auto initialization
  const defaultFieldsMap: Record<string, Omit<FieldConfigInput, 'id'>[]> = {
    contacts: DEFAULT_CONTACTS_FIELDS,
    tasks: DEFAULT_TASKS_FIELDS,
    mailcases: DEFAULT_MAILS_FIELDS,
    writtenquestions: DEFAULT_QE_FIELDS,
    permanences: DEFAULT_PERMANENCES_FIELDS,
  }

  useEffect(() => {
    // If no fields for the active module, initialize them!
    const activeFields = fields.filter(f => f.module === activeModule)
    if (!isPendingInit && activeFields.length === 0 && defaultFieldsMap[activeModule]) {
      startInitTransition(async () => {
        await initializeModuleFieldsAction(activeModule, defaultFieldsMap[activeModule])
        window.location.reload()
      })
    }
  }, [fields, activeModule, isPendingInit])

  const moduleFields = fields.filter(f => f.module === activeModule).sort((a, b) => a.order - b.order)

  // Grouper par section
  const sections = Array.from(new Set(moduleFields.map(f => f.section || 'Général')))

  const handleDragEnd = (event: DragEndEvent, section: string) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const sectionFields = moduleFields.filter(f => (f.section || 'Général') === section)
      const oldIndex = sectionFields.findIndex(f => f.id === active.id)
      const newIndex = sectionFields.findIndex(f => f.id === over.id)
      
      const reorderedSection = arrayMove(sectionFields, oldIndex, newIndex)
      
      // Mettre à jour l'ordre global basé sur cet ordre de section
      // Pour éviter des collisions d'ordres, on peut juste réaffecter .order = index
      setFields(prev => {
        const next = [...prev]
        reorderedSection.forEach((f, idx) => {
          const item = next.find(x => x.id === f.id)
          if (item) item.order = idx // Warning: order might collide across sections if we just use index 0,1,2, but it's fine if we sort by section then order.
        })
        return next
      })
      setHasChanges(true)
    }
  }

  const handleChangeLabel = (id: string, val: string) => {
    setFields(prev => prev.map(f => {
      if (f.id === id) {
        // If the val is the same as defaultLabel, we can set customLabel to null
        return { ...f, customLabel: val === f.defaultLabel ? null : val }
      }
      return f
    }))
    setHasChanges(true)
  }

  const handleResetLabel = (id: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, customLabel: null } : f))
    setHasChanges(true)
  }

  const handleToggleVisible = (id: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, isVisible: !f.isVisible } : f))
    setHasChanges(true)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSave = () => {
    setSuccessBanner(false)
    startSaveTransition(async () => {
      // Préparer le payload avec les champs modifiés
      const updates = fields.map(f => ({ id: f.id, customLabel: f.customLabel, isVisible: f.isVisible, order: f.order }))
      const res = await updateFieldsAction(updates)
      if (res.success) {
        setHasChanges(false)
        setSuccessBanner(true)
        setTimeout(() => setSuccessBanner(false), 3000)
      } else {
        alert('Erreur lors de la sauvegarde: ' + res.error)
      }
    })
  }

  if (isPendingInit) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Initialisation des champs... <Loader2 size={16} className="spin" /></div>
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {/* Barre de contrôle supérieure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            value={activeModule} 
            onChange={e => {
              setActiveModule(e.target.value)
              setExpandedSections({})
            }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
          >
            <option value="contacts">Module : Contacts</option>
            <option value="tasks">Module : Tâches</option>
            <option value="mailcases">Module : Courriers</option>
            <option value="writtenquestions">Module : Questions Écrites</option>
            <option value="permanences">Module : Permanences</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {successBanner && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={16} /> Sauvegardé</span>}
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isPendingSave}
            className="button"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              opacity: (!hasChanges || isPendingSave) ? 0.5 : 1,
              background: '#ec4899', border: 'none', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {isPendingSave ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Liste des sections */}
      <div style={{ padding: '1.5rem' }}>
        {sections.map(section => {
          const sectionFields = moduleFields.filter(f => (f.section || 'Général') === section)
          const isOpen = expandedSections[section] !== false

          return (
            <div key={section} style={{ marginBottom: '2rem' }}>
              <div 
                onClick={() => toggleSection(section)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer', marginBottom: isOpen ? '1rem' : 0 }}
              >
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{section}</h2>
                <div style={{ color: '#94a3b8' }}>
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {isOpen && (
                <div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, section)}>
                    <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {sectionFields.map(field => (
                        <SortableFieldRow 
                          key={field.id} 
                          field={field} 
                          onChangeLabel={handleChangeLabel}
                          onToggleVisible={handleToggleVisible}
                          onResetLabel={handleResetLabel}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
