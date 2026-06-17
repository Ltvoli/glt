import React from 'react'

export function renderPermanenceField(
  fieldKey: string,
  label: string,
  permanence: any = {},
  users: any[] = [],
  stateProps?: {
    title?: string
    setTitle?: (val: string) => void
    dateStr?: string
    setDateStr?: (val: string) => void
    notes?: string
    setNotes?: (val: string) => void
  }
) {
  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'title' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label} *</label>
          <input
            type="text"
            name="title"
            required
            className="form-control"
            value={stateProps?.title !== undefined ? stateProps.title : (permanence.title || '')}
            onChange={e => stateProps?.setTitle?.(e.target.value)}
            placeholder="Ex: Permanence Mobile - Nice Ouest"
          />
        </div>
      )}

      {fieldKey === 'status' && (
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label}</label>
          <select name="status" className="form-control" defaultValue={permanence.status || 'DRAFT'}>
            <option value="DRAFT">Brouillon</option>
            <option value="IN_PROGRESS">En préparation</option>
            <option value="TO_CORRECT">À corriger</option>
            <option value="READY">Prête</option>
            <option value="VALIDATED">Validée</option>
            <option value="ARCHIVED">Archivée</option>
          </select>
        </div>
      )}

      {fieldKey === 'scheduledStartDate' && (
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label} *</label>
          <input
            type="date"
            name="scheduledStartDate"
            required
            className="form-control"
            value={stateProps?.dateStr !== undefined ? stateProps.dateStr : (permanence.scheduledStartDate ? new Date(permanence.scheduledStartDate).toISOString().split('T')[0] : '')}
            onChange={e => stateProps?.setDateStr?.(e.target.value)}
          />
        </div>
      )}

      {fieldKey === 'ownerUserId' && (
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label}</label>
          <select name="ownerUserId" className="form-control" defaultValue={permanence.ownerUserId || ''}>
            <option value="">Sélectionner un responsable</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {fieldKey === 'notes' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label}</label>
          <textarea
            name="notes"
            rows={3}
            className="form-control"
            style={{ resize: 'vertical' }}
            value={stateProps?.notes !== undefined ? stateProps.notes : (permanence.notes || '')}
            onChange={e => stateProps?.setNotes?.(e.target.value)}
            placeholder="Détails logistiques, notes de préparation..."
          />
        </div>
      )}

      {fieldKey === 'deputyRemarks' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="block text-sm font-semibold mb-1 text-gray-700">{label}</label>
          <textarea
            name="deputyRemarks"
            rows={3}
            className="form-control"
            style={{ resize: 'vertical' }}
            defaultValue={permanence.deputyRemarks || ''}
            placeholder="Remarques générales du député..."
          />
        </div>
      )}
    </React.Fragment>
  )
}
