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
        <div className="form-group">
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
    </React.Fragment>
  )
}
