'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMail } from '../../actions'
import { renderMailField } from '../../dynamic-mail-fields'
import Autocomplete from '@/components/ui/autocomplete'

const initialState = {
  error: ''
}

export default function EditMailForm({ mail, users, contacts, tasks, initialContactId, initialTaskId, dictionary = [], fieldConfig = {} }: { mail: any, users: any[], contacts: any[], tasks: any[], initialContactId?: string, initialTaskId?: string, dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const updateMailWithId = updateMail.bind(null, mail.id)
  const [state, formAction, isPending] = useActionState(updateMailWithId, initialState)
  const [mailType, setMailType] = useState(mail.type || 'ENTRANT')
  const [valStatus, setValStatus] = useState(mail.validationStatus || '')

  const contactOptions = contacts.map(c => ({
    value: c.id,
    label: `${c.lastName} ${c.firstName}${c.usageName ? ` (ép. ${c.usageName})` : ''}${c.city ? ` (${c.city})` : ''}`
  }))
  const router = useRouter()

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
      {infoFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations principales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {infoFields.map((f: any) => renderMailField(f.key, f.label, mail, users, mailType, setMailType, undefined))}
          </div>
        </>
      )}

      {expFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Expéditeur / Destinataire</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {expFields.map((f: any) => renderMailField(f.key, f.label, mail, users, mailType, setMailType, undefined))}
          </div>
        </>
      )}

      {planFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Planification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {planFields.map((f: any) => renderMailField(f.key, f.label, mail, users, mailType, setMailType, undefined))}
          </div>
        </>
      )}

      {/* Hidden fallbacks for required fields if they are not visible in config */}
      {!fieldConfig?.type?.isVisible && (
        <>
          <input type="hidden" name="type" value={mailType} />
          {mailType === 'ENTRANT' ? (
            <input type="hidden" name="receiveDate" value={mail.receiveDate ? new Date(mail.receiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
          ) : (
            <input type="hidden" name="sentDate" value={mail.sentDate ? new Date(mail.sentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
          )}
        </>
      )}
      {!fieldConfig?.subject?.isVisible && (
        <input type="hidden" name="subject" value={mail.subject} />
      )}
      {!fieldConfig?.channel?.isVisible && (
        <input type="hidden" name="channel" value={mail.channel || 'POSTAL'} />
      )}

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Liaisons (Optionnel)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="contactId">Lier à un Contact</label>
          <Autocomplete 
            options={contactOptions} 
            defaultValue={initialContactId || ""} 
            name="contactId" 
            placeholder="Rechercher un contact..." 
          />
          <small style={{ color: 'var(--text-muted)' }}>Permet de retrouver ce courrier dans la fiche du contact.</small>
        </div>
        <div className="form-group">
          <label htmlFor="taskId">Lier à une Tâche</label>
          <select id="taskId" name="taskId" className="form-control" defaultValue={initialTaskId || ""}>
            <option value="">Aucune tâche</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <small style={{ color: 'var(--text-muted)' }}>Lier ce courrier à une tâche existante (ex: rédaction d'une réponse).</small>
        </div>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <input type="hidden" name="validationStatus" value={valStatus} />
        <button type="button" className="button outline" onClick={() => router.push(`/mails/${mail.id}`)}>
          Annuler
        </button>
        {mailType === 'SORTANT' ? (
          <>
            <button 
              type="submit" 
              className="button outline" 
              disabled={isPending}
              onClick={() => setValStatus('BROUILLON')}
            >
              Enregistrer comme Brouillon
            </button>
            <button 
              type="submit" 
              className="button" 
              disabled={isPending}
              onClick={() => setValStatus('A_VALIDER')}
            >
              Enregistrer et Soumettre
            </button>
          </>
        ) : (
          <button type="submit" className="button" disabled={isPending}>
            {isPending ? 'Enregistrement...' : 'Enregistrer le courrier'}
          </button>
        )}
      </div>
    </form>
  )
}
