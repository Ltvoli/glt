'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, Tag } from 'lucide-react'
import { createDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry } from './actions'

type DictionaryEntry = {
  id: string
  type: string
  code: string
  label: string
  color: string | null
  icon: string | null
  order: number
  isActive: boolean
  isDefault: boolean
}

const TYPE_LABELS: Record<string, string> = {
  'TASK_STATUS': 'Statuts des Tâches',
  'TASK_PRIORITY': 'Priorités des Tâches',
  'CONTACT_TYPE': 'Types de Contacts',
  'CONTACT_ROLE': 'Rôles des Contacts',
  'MAIL_STATUS': 'Statuts des Courriers',
  'QE_TYPE': 'Types de QE',
  'QE_STATUS': 'Statuts des QE',
}

export default function DictionaryManager({ initialData }: { initialData: DictionaryEntry[] }) {
  const [data, setData] = useState<DictionaryEntry[]>(initialData)
  const types = Array.from(new Set(data.map(d => d.type)))
  const [selectedType, setSelectedType] = useState<string>(types[0] || '')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DictionaryEntry>>({})
  
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<Partial<DictionaryEntry>>({ type: selectedType })

  const entries = data.filter(d => d.type === selectedType).sort((a, b) => a.order - b.order)

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      await updateDictionaryEntry(editingId, editForm)
      setData(data.map(d => d.id === editingId ? { ...d, ...editForm } as DictionaryEntry : d))
      setEditingId(null)
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la mise à jour")
    }
  }

  const handleCreate = async () => {
    if (!createForm.code || !createForm.label) return alert("Code et Label requis")
    try {
      const newEntry = await createDictionaryEntry({
        type: selectedType,
        code: createForm.code,
        label: createForm.label,
        color: createForm.color || null,
        icon: createForm.icon || null,
        order: createForm.order || entries.length + 1,
        isDefault: createForm.isDefault || false,
      })
      setData([...data, newEntry])
      setIsCreating(false)
      setCreateForm({ type: selectedType })
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la création (le code existe peut-être déjà)")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette valeur ? Cela peut causer des erreurs si elle est utilisée.")) return
    try {
      await deleteDictionaryEntry(id)
      setData(data.filter(d => d.id !== id))
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la suppression")
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200">
        <div className="w-64 border-r border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wider">Types de listes</h2>
          <div className="space-y-1">
            {types.map(type => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setCreateForm({ type }) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedType === type ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">{TYPE_LABELS[selectedType] || selectedType}</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {entries.map(entry => {
              const isEditing = editingId === entry.id
              return (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-colors">
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                      <input 
                        type="text" 
                        value={editForm.label || ''} 
                        onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                        className="col-span-1 border rounded px-2 py-1 text-sm"
                        placeholder="Label (ex: En cours)"
                      />
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={editForm.color || '#94a3b8'} 
                          onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                          className="h-8 w-8 rounded cursor-pointer"
                        />
                        <span className="text-xs text-slate-500">{editForm.color || 'Aucune'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600 flex items-center gap-1">
                          <input type="checkbox" checked={editForm.isDefault} onChange={e => setEditForm({...editForm, isDefault: e.target.checked})} />
                          Défaut
                        </label>
                        <label className="text-sm text-slate-600 flex items-center gap-1 ml-4">
                          <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})} />
                          Actif
                        </label>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleUpdate} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs">
                          {entry.order}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{entry.label}</span>
                            {entry.isDefault && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Défaut</span>}
                            {!entry.isActive && <span className="text-[10px] uppercase font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Désactivé</span>}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{entry.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {entry.color && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs text-slate-500">{entry.color}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                          <button 
                            onClick={() => {
                              setEditingId(entry.id)
                              setEditForm({ label: entry.label, color: entry.color, order: entry.order, isActive: entry.isActive, isDefault: entry.isDefault })
                            }} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {isCreating && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                  <input 
                    type="text" 
                    value={createForm.code || ''} 
                    onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className="col-span-1 border rounded px-2 py-1 text-sm font-mono"
                    placeholder="CODE_VALEUR"
                  />
                  <input 
                    type="text" 
                    value={createForm.label || ''} 
                    onChange={e => setCreateForm({ ...createForm, label: e.target.value })}
                    className="col-span-1 border rounded px-2 py-1 text-sm"
                    placeholder="Label affiché"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={createForm.color || '#94a3b8'} 
                      onChange={e => setCreateForm({ ...createForm, color: e.target.value })}
                      className="h-8 w-8 rounded cursor-pointer"
                    />
                    <label className="text-sm text-slate-600 flex items-center gap-1 ml-4">
                      <input type="checkbox" checked={createForm.isDefault || false} onChange={e => setCreateForm({...createForm, isDefault: e.target.checked})} />
                      Défaut
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={handleCreate} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors">Créer</button>
                    <button onClick={() => setIsCreating(false)} className="text-slate-500 px-3 py-1.5 rounded text-sm hover:bg-slate-200 transition-colors">Annuler</button>
                  </div>
                </div>
              </div>
            )}
            
            {!isCreating && entries.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                Aucune valeur pour ce type.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
