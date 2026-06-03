'use client'

import { useActionState, useState } from 'react'
import { createMail } from '../actions'

const initialState = {
  error: ''
}

export default function MailForm({ users, contacts, tasks, initialParentId, initialSubject, initialContactId }: { users: any[], contacts: any[], tasks: any[], initialParentId?: string, initialSubject?: string, initialContactId?: string }) {
  const [state, formAction, isPending] = useActionState(createMail, initialState)
  const [mailType, setMailType] = useState(initialParentId ? 'SORTANT' : 'ENTRANT')

  return (
    <form action={formAction}>
      {initialParentId && (
        <input type="hidden" name="parentMailCaseId" value={initialParentId} />
      )}
      
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations principales</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="type">Type *</label>
          <select id="type" name="type" className="form-control" value={mailType} onChange={e => setMailType(e.target.value)}>
            <option value="ENTRANT">Entrant (Reçu)</option>
            <option value="SORTANT">Sortant (Envoyé)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="subject">Sujet du courrier / objet *</label>
          <input type="text" id="subject" name="subject" className="form-control" defaultValue={initialSubject || ''} required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {mailType === 'ENTRANT' ? (
          <div className="form-group">
            <label htmlFor="receiveDate">Date de réception *</label>
            <input type="date" id="receiveDate" name="receiveDate" className="form-control" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="sentDate">Date d'envoi *</label>
            <input type="date" id="sentDate" name="sentDate" className="form-control" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="channel">Canal *</label>
          <select id="channel" name="channel" className="form-control" required defaultValue="POSTAL">
            <option value="POSTAL">Postal</option>
            <option value="MAIL">Email</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {mailType === 'ENTRANT' ? (
          <div className="form-group">
            <label htmlFor="senderName">Nom de l'expéditeur (si non lié à un contact)</label>
            <input type="text" id="senderName" name="senderName" className="form-control" />
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="recipientName">Nom du destinataire (si non lié à un contact)</label>
            <input type="text" id="recipientName" name="recipientName" className="form-control" />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="city">Commune</label>
          <input type="text" id="city" name="city" className="form-control" />
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Traitement</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="category">Catégorie</label>
          <select id="category" name="category" className="form-control" defaultValue="">
            <option value="">Non catégorisé</option>
            <option value="DEMANDE_INTERVENTION">Demande d'intervention</option>
            <option value="INVITATION">Invitation</option>
            <option value="INFORMATION">Information</option>
            <option value="RECLAMATION">Réclamation</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="urgency">Urgence</label>
          <select id="urgency" name="urgency" className="form-control" defaultValue="NORMALE">
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute / Urgent</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="assigneeId">Assigner à</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue="">
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

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
        <label htmlFor="content">Contenu du courrier (Copie de l'email, retranscription...)</label>
        <textarea id="content" name="content" className="form-control" rows={8} placeholder="Collez le texte du courrier ici..."></textarea>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="attachment">Pièce jointe (PDF, Image...)</label>
        <input type="file" id="attachment" name="attachment" className="form-control" style={{ padding: '0.5rem' }} />
        <small style={{ color: 'var(--text-muted)' }}>Vous pourrez en ajouter d'autres plus tard depuis la fiche du courrier.</small>
      </div>

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="notes">Notes internes (Équipe)</label>
        <textarea id="notes" name="notes" className="form-control" rows={3} placeholder="Informations complémentaires, contexte..."></textarea>
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
