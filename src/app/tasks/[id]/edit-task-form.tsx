'use client'

import { useActionState } from 'react'
import { updateTask, deleteTaskAction } from './actions'
import { renderTaskField } from '../dynamic-task-fields'

const initialState = {
  error: '',
  success: false
}

export default function EditTaskForm({ task, users, allTags = [], dictionary = [], fieldConfig = {}, canDelete = false }: { task: any, users: any[], allTags?: any[], dictionary?: any[], fieldConfig?: Record<string, any>, canDelete?: boolean }) {
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

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Récurrence</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {renderTaskField('isRecurring', 'Tâche récurrente', task, users, dictionary, allTags)}
        
        <div id="recurrence-section" style={{ 
          gridColumn: '1 / -1', 
          display: task.isRecurring ? 'grid' : 'none', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '1.5rem',
          backgroundColor: '#f8fafc',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {renderTaskField('recurrencePattern', 'Périodicité', task, users, dictionary, allTags)}
          {renderTaskField('recurrenceInterval', 'Répéter tous les X (jours/semaines/mois)', task, users, dictionary, allTags)}
          {renderTaskField('startDate', 'Date de première occurrence', task, users, dictionary, allTags)}
        </div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {canDelete ? (
          <button 
            type="button" 
            className="button outline" 
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={async () => {
              if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche définitivement ?')) {
                const formData = new FormData()
                formData.append('taskId', task.id)
                await deleteTaskAction(formData)
              }
            }}
          >
            Supprimer la tâche
          </button>
        ) : <div />}
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Mettre à jour la tâche'}
        </button>
      </div>
    </form>
  )
}
