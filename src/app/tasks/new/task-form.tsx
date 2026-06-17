'use client'

import { useActionState } from 'react'
import { createTask } from '../actions'
import { renderTaskField } from '../dynamic-task-fields'

const initialState = {
  error: ''
}

export default function TaskForm({ users, contactId, allTags = [], dictionary = [], fieldConfig = {} }: { users: any[], contactId?: string, allTags?: any[], dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const [state, formAction, isPending] = useActionState(createTask, initialState)

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
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      
      {infoFields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          {infoFields.map((f: any) => renderTaskField(f.key, f.label, {}, users, dictionary, allTags))}
        </div>
      )}

      {planFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Planification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {planFields.map((f: any) => renderTaskField(f.key, f.label, {}, users, dictionary, allTags))}
          </div>
        </>
      )}

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
