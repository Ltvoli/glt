'use client'

import { useActionState, useState } from 'react'
import { createMail } from '../actions'
import { renderMailField } from '../dynamic-mail-fields'

const initialState = {
  error: ''
}

export default function MailForm({ users, contacts, tasks, initialParentId, initialSubject, initialContactId, dictionary = [], fieldConfig = {} }: { users: any[], contacts: any[], tasks: any[], initialParentId?: string, initialSubject?: string, initialContactId?: string, dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const [state, formAction, isPending] = useActionState(createMail, initialState)
  const [mailType, setMailType] = useState(initialParentId ? 'SORTANT' : 'ENTRANT')

  const infoFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Informations' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const expFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Expéditeur / Destinataire' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const planFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Planification' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  return (
    <form action={formAction}>
      {initialParentId && (
        <input type="hidden" name="parentMailCaseId" value={initialParentId} />
      )}

      {infoFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations principales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {infoFields.map((f: any) => renderMailField(f.key, f.label, {}, users, mailType, setMailType, initialSubject))}
          </div>
        </>
      )}

      {expFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Expéditeur / Destinataire</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {expFields.map((f: any) => renderMailField(f.key, f.label, {}, users, mailType, setMailType, initialSubject))}
          </div>
        </>
      )}

      {planFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Planification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {planFields.map((f: any) => renderMailField(f.key, f.label, {}, users, mailType, setMailType, initialSubject))}
          </div>
        </>
      )}

      {/* Hidden fallbacks for required fields if they are not visible in config */}
      {!fieldConfig?.type?.isVisible && (
        <>
          <input type="hidden" name="type" value={mailType} />
          {mailType === 'ENTRANT' ? (
            <input type="hidden" name="receiveDate" value={new Date().toISOString().split('T')[0]} />
          ) : (
            <input type="hidden" name="sentDate" value={new Date().toISOString().split('T')[0]} />
          )}
        </>
      )}
      {!fieldConfig?.subject?.isVisible && (
        <input type="hidden" name="subject" value={initialSubject || 'Courrier sans sujet'} />
      )}
      {!fieldConfig?.channel?.isVisible && (
        <input type="hidden" name="channel" value="POSTAL" />
      )}

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Liaisons (Optionnel)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="contactId">Lier à un Contact</label>
          <select id="contactId" name="contactId" className="form-control" defaultValue={initialContactId || ""}>
            <option value="">Aucun contact</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>
            ))}
          </select>
          <small style={{ color: 'var(--text-muted)' }}>Permet de retrouver ce courrier dans la fiche du contact.</small>
        </div>
        <div className="form-group">
          <label htmlFor="taskId">Lier à une Tâche</label>
          <select id="taskId" name="taskId" className="form-control" defaultValue="">
            <option value="">Aucune tâche</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <small style={{ color: 'var(--text-muted)' }}>Lier ce courrier à une tâche existante (ex: rédaction d'une réponse).</small>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="attachment">Pièce jointe (PDF, Image...)</label>
        <input type="file" id="attachment" name="attachment" className="form-control" style={{ padding: '0.5rem' }} />
        <small style={{ color: 'var(--text-muted)' }}>Vous pourrez en ajouter d'autres plus tard depuis la fiche du courrier.</small>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer le courrier'}
        </button>
      </div>
    </form>
  )
}

