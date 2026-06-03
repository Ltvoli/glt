'use client'

import { useActionState } from 'react'
import { updateTask } from './actions'
import TagSelector from '@/components/ui/tag-selector'

const initialState = {
  error: '',
  success: false
}

export default function EditTaskForm({ task, users, allTags = [] }: { task: any, users: any[], allTags?: any[] }) {
  const [state, formAction, isPending] = useActionState(updateTask, initialState)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={task.id} />
      
      <div className="form-group">
        <label htmlFor="title">Titre de la tâche *</label>
        <input type="text" id="title" name="title" className="form-control" defaultValue={task.title} required />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" className="form-control" rows={4} defaultValue={task.description || ''} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="priority">Priorité</label>
          <select id="priority" name="priority" className="form-control" defaultValue={task.priority}>
            <option value="HAUTE">Haute</option>
            <option value="NORMALE">Normale</option>
            <option value="BASSE">Basse</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">Statut</label>
          <select id="status" name="status" className="form-control" defaultValue={task.status}>
            <option value="A_FAIRE">À faire</option>
            <option value="EN_COURS">En cours</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="TERMINEE">Terminée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assigneeId">Assigné à</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={task.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Échéance</label>
          <input 
            type="date" 
            id="dueDate" 
            name="dueDate" 
            className="form-control" 
            defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''} 
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="expectedDeliverable">Livrable attendu</label>
        <input type="text" id="expectedDeliverable" name="expectedDeliverable" className="form-control" defaultValue={task.expectedDeliverable || ''} placeholder="ex: Rapport PDF, Note de synthèse..." />
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="tags">Tags</label>
        <TagSelector 
          allTags={allTags} 
          defaultValue={task.tags?.map((t: any) => t.tag.name).join(', ') || ''} 
          name="tags" 
          placeholder="Urgent, Synthèse, RDV..." 
        />
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Tâche mise à jour avec succès.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Mettre à jour la tâche'}
        </button>
      </div>
    </form>
  )
}
