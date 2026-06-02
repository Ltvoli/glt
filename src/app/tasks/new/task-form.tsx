'use client'

import { useActionState } from 'react'
import { createTask } from '../actions'

const initialState = {
  error: ''
}

export default function TaskForm({ users }: { users: any[] }) {
  const [state, formAction, isPending] = useActionState(createTask, initialState)

  return (
    <form action={formAction}>
      <div className="form-group">
        <label htmlFor="title">Titre de la tâche *</label>
        <input type="text" id="title" name="title" className="form-control" required />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" className="form-control" rows={4} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="priority">Priorité</label>
          <select id="priority" name="priority" className="form-control" defaultValue="NORMALE">
            <option value="HAUTE">Haute</option>
            <option value="NORMALE">Normale</option>
            <option value="BASSE">Basse</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">Statut</label>
          <select id="status" name="status" className="form-control" defaultValue="A_FAIRE">
            <option value="A_FAIRE">À faire</option>
            <option value="EN_COURS">En cours</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="TERMINEE">Terminée</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assigneeId">Assigner à</label>
          <select id="assigneeId" name="assigneeId" className="form-control">
            <option value="">Non assigné</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Échéance</label>
          <input type="date" id="dueDate" name="dueDate" className="form-control" />
        </div>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer la tâche'}
        </button>
      </div>
    </form>
  )
}
