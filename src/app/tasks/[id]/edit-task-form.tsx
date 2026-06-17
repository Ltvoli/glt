'use client'

import { useActionState } from 'react'
import { updateTask } from './actions'
import { renderTaskField } from '../dynamic-task-fields'

const initialState = {
  error: '',
  success: false
}

export default function EditTaskForm({ task, users, allTags = [], dictionary = [], fieldConfig = {} }: { task: any, users: any[], allTags?: any[], dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const [state, formAction, isPending] = useActionState(updateTask, initialState)

  const infoFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Informations' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const planFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Planification' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={task.id} />
      
      {infoFields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          {infoFields.map((f: any) => renderTaskField(f.key, f.label, task, users, dictionary, allTags))}
        </div>
      )}

      {planFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Planification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {planFields.map((f: any) => renderTaskField(f.key, f.label, task, users, dictionary, allTags))}
          </div>
        </>
      )}

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
