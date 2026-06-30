import React from 'react'
import TagSelector from '@/components/ui/tag-selector'

export function renderTaskField(
  fieldKey: string,
  label: string,
  task: any = {},
  users: any[] = [],
  dictionary: any[] = [],
  allTags: any[] = []
) {
  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'title' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="title">{label} *</label>
          <input type="text" id="title" name="title" className="form-control" defaultValue={task.title || ''} required />
        </div>
      )}

      {fieldKey === 'description' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="description">{label}</label>
          <textarea id="description" name="description" className="form-control" rows={4} defaultValue={task.description || ''} />
        </div>
      )}

      {fieldKey === 'expectedDeliverable' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="expectedDeliverable">{label}</label>
          <input type="text" id="expectedDeliverable" name="expectedDeliverable" className="form-control" defaultValue={task.expectedDeliverable || ''} placeholder="ex: Rapport PDF, Note de synthèse..." />
        </div>
      )}

      {fieldKey === 'tags' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="tags">{label}</label>
          <TagSelector 
            allTags={allTags} 
            defaultValue={task.tags?.map((t: any) => t.tag.name).join(', ') || ''} 
            name="tags" 
            placeholder="Urgent, Synthèse, RDV..." 
          />
        </div>
      )}

      {fieldKey === 'priority' && (
        <div className="form-group">
          <label htmlFor="priority">{label}</label>
          <select id="priority" name="priority" className="form-control" defaultValue={task.priority || "NORMALE"}>
            {dictionary.filter(d => d.type === 'TASK_PRIORITY').length > 0 ? (
              dictionary.filter(d => d.type === 'TASK_PRIORITY').map(d => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))
            ) : (
              <>
                <option value="HAUTE">Haute</option>
                <option value="NORMALE">Normale</option>
                <option value="BASSE">Basse</option>
              </>
            )}
          </select>
        </div>
      )}

      {fieldKey === 'status' && (
        <div className="form-group">
          <label htmlFor="status">{label}</label>
          <select id="status" name="status" className="form-control" defaultValue={task.status || "A_FAIRE"}>
            {dictionary.filter(d => d.type === 'TASK_STATUS').length > 0 ? (
              dictionary.filter(d => d.type === 'TASK_STATUS').map(d => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))
            ) : (
              <>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="TERMINEE">Terminée</option>
                <option value="ANNULEE">Annulée</option>
              </>
            )}
          </select>
        </div>
      )}

      {fieldKey === 'assigneeId' && (
        <div className="form-group">
          <label htmlFor="assigneeId">{label}</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={task.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
      )}

      {fieldKey === 'dueDate' && (
        <div className="form-group" style={{ display: task.isRecurring ? 'none' : 'block' }}>
          <label htmlFor="dueDate">{label}</label>
          <input 
            type="date" 
            id="dueDate" 
            name="dueDate" 
            className="form-control" 
            defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''} 
          />
        </div>
      )}

      {fieldKey === 'isRecurring' && (
        <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="isRecurring" 
            name="isRecurring" 
            defaultChecked={task.isRecurring || false} 
            onChange={(e) => {
              const recurrenceSection = document.getElementById('recurrence-section')
              if (recurrenceSection) {
                recurrenceSection.style.display = e.target.checked ? 'grid' : 'none'
              }
              const dueDateField = document.getElementById('dueDate')
              if (dueDateField) {
                const parentGroup = dueDateField.closest('.form-group') as HTMLElement
                if (parentGroup) {
                  parentGroup.style.display = e.target.checked ? 'none' : 'block'
                }
              }
            }}
          />
          <label htmlFor="isRecurring" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 'bold' }}>
            {label}
          </label>
        </div>
      )}

      {fieldKey === 'recurrencePattern' && (
        <div className="form-group">
          <label htmlFor="recurrencePattern">{label}</label>
          <select id="recurrencePattern" name="recurrencePattern" className="form-control" defaultValue={task.recurrencePattern || "MONTHLY"}>
            <option value="DAILY">Quotidienne</option>
            <option value="WEEKLY">Hebdomadaire</option>
            <option value="MONTHLY">Mensuelle</option>
          </select>
        </div>
      )}

      {fieldKey === 'recurrenceInterval' && (
        <div className="form-group">
          <label htmlFor="recurrenceInterval">{label}</label>
          <input 
            type="number" 
            id="recurrenceInterval" 
            name="recurrenceInterval" 
            className="form-control" 
            min={1} 
            defaultValue={task.recurrenceInterval || 1} 
          />
        </div>
      )}

      {fieldKey === 'startDate' && (
        <div className="form-group">
          <label htmlFor="startDate">{label}</label>
          <input 
            type="date" 
            id="startDate" 
            name="startDate" 
            className="form-control" 
            defaultValue={task.nextOccurrence ? new Date(task.nextOccurrence).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
          />
        </div>
      )}
    </React.Fragment>
  )
}
