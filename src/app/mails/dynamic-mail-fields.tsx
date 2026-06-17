import React from 'react'

export function renderMailField(
  fieldKey: string,
  label: string,
  mail: any = {},
  users: any[] = [],
  mailType: string = 'ENTRANT',
  setMailType?: (val: string) => void,
  initialSubject?: string
) {
  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'type' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
          <div className="form-group">
            <label htmlFor="type">{label} *</label>
            <select
              id="type"
              name="type"
              className="form-control"
              value={mailType}
              onChange={e => setMailType && setMailType(e.target.value)}
            >
              <option value="ENTRANT">Entrant (Reçu)</option>
              <option value="SORTANT">Sortant (Envoyé)</option>
            </select>
          </div>
          {mailType === 'ENTRANT' ? (
            <div className="form-group">
              <label htmlFor="receiveDate">Date de réception *</label>
              <input
                type="date"
                id="receiveDate"
                name="receiveDate"
                className="form-control"
                required
                defaultValue={mail.receiveDate ? new Date(mail.receiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="sentDate">Date d'envoi *</label>
              <input
                type="date"
                id="sentDate"
                name="sentDate"
                className="form-control"
                required
                defaultValue={mail.sentDate ? new Date(mail.sentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      )}

      {fieldKey === 'subject' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="subject">{label} *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="form-control"
            defaultValue={mail.subject || initialSubject || ''}
            required
          />
        </div>
      )}

      {fieldKey === 'channel' && (
        <div className="form-group">
          <label htmlFor="channel">{label} *</label>
          <select id="channel" name="channel" className="form-control" required defaultValue={mail.channel || 'POSTAL'}>
            <option value="POSTAL">Postal</option>
            <option value="MAIL">Email</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
      )}

      {fieldKey === 'category' && (
        <div className="form-group">
          <label htmlFor="category">{label}</label>
          <select id="category" name="category" className="form-control" defaultValue={mail.category || ''}>
            <option value="">Non catégorisé</option>
            <option value="DEMANDE_INTERVENTION">Demande d'intervention</option>
            <option value="INVITATION">Invitation</option>
            <option value="INFORMATION">Information</option>
            <option value="RECLAMATION">Réclamation</option>
          </select>
        </div>
      )}

      {fieldKey === 'urgency' && (
        <div className="form-group">
          <label htmlFor="urgency">{label}</label>
          <select id="urgency" name="urgency" className="form-control" defaultValue={mail.urgency || 'NORMALE'}>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute / Urgent</option>
          </select>
        </div>
      )}

      {fieldKey === 'content' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="content">{label}</label>
          <textarea id="content" name="content" className="form-control" rows={8} defaultValue={mail.content || ''} placeholder="Collez le texte du courrier ici..." />
        </div>
      )}

      {fieldKey === 'notes' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="notes">{label}</label>
          <textarea id="notes" name="notes" className="form-control" rows={3} defaultValue={mail.notes || ''} placeholder="Informations complémentaires, contexte..." />
        </div>
      )}

      {fieldKey === 'senderName' && mailType === 'ENTRANT' && (
        <div className="form-group">
          <label htmlFor="senderName">{label}</label>
          <input
            type="text"
            id="senderName"
            name="senderName"
            className="form-control"
            defaultValue={mail.senderName || ''}
          />
        </div>
      )}

      {fieldKey === 'recipientName' && mailType === 'SORTANT' && (
        <div className="form-group">
          <label htmlFor="recipientName">{label}</label>
          <input
            type="text"
            id="recipientName"
            name="recipientName"
            className="form-control"
            defaultValue={mail.recipientName || ''}
          />
        </div>
      )}

      {fieldKey === 'city' && (
        <div className="form-group">
          <label htmlFor="city">{label}</label>
          <input
            type="text"
            id="city"
            name="city"
            className="form-control"
            defaultValue={mail.city || ''}
          />
        </div>
      )}

      {fieldKey === 'responseDueDate' && (
        <div className="form-group">
          <label htmlFor="responseDueDate">{label}</label>
          <input
            type="date"
            id="responseDueDate"
            name="responseDueDate"
            className="form-control"
            defaultValue={mail.responseDueDate ? new Date(mail.responseDueDate).toISOString().split('T')[0] : ''}
          />
        </div>
      )}

      {fieldKey === 'assigneeId' && (
        <div className="form-group">
          <label htmlFor="assigneeId">{label}</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={mail.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}
    </React.Fragment>
  )
}
