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
    <form action={formAction} encType="multipart/form-data">
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

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Récurrence</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {renderTaskField('isRecurring', 'Tâche récurrente', {}, users, dictionary, allTags)}
        
        <div id="recurrence-section" style={{ 
          gridColumn: '1 / -1', 
          display: 'none', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '1.5rem',
          backgroundColor: '#f8fafc',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {renderTaskField('recurrencePattern', 'Périodicité', {}, users, dictionary, allTags)}
          {renderTaskField('recurrenceInterval', 'Répéter tous les X (jours/semaines/mois)', {}, users, dictionary, allTags)}
          {renderTaskField('startDate', 'Date de première occurrence', {}, users, dictionary, allTags)}
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pièces jointes</h3>
      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="attachments" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Ajouter des fichiers (.pdf, .doc, .docx, .xls, .xlsx, .jpg, .png)
        </label>
        <input 
          type="file" 
          id="attachments" 
          name="attachments" 
          multiple 
          className="form-control" 
          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
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
