'use client'

import { useActionState } from 'react'
import { updateSendingSettings } from './sending-actions'
import { Save, AlertCircle } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function SendingForm({ initialSettings }: { initialSettings: any }) {
  const [state, formAction, isPending] = useActionState(updateSendingSettings, initialState)

  return (
    <form action={formAction} className="card" style={{ maxWidth: '800px' }}>
      
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Expéditeur par défaut</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="senderName" style={{ fontWeight: 600 }}>Nom d'expéditeur</label>
          <input type="text" id="senderName" name="senderName" className="form-control" defaultValue={initialSettings.senderName} placeholder="Ex: Lionel Tivoli" />
        </div>
        <div className="form-group">
          <label htmlFor="senderEmail" style={{ fontWeight: 600 }}>Email d'expéditeur</label>
          <input type="email" id="senderEmail" name="senderEmail" className="form-control" defaultValue={initialSettings.senderEmail} placeholder="Ex: contact@lionel-tivoli.fr" />
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          L'adresse email configurée ici doit être vérifiée et autorisée au préalable sur votre compte Brevo pour que les envois aboutissent.
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Quotas de sécurité (Par jour)</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Fixez une limite d'envoi journalière depuis le CRM pour éviter tout dépassement accidentel de votre forfait.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="emailQuota" style={{ fontWeight: 600 }}>Quota E-mails / jour</label>
          <input type="number" id="emailQuota" name="emailQuota" className="form-control" defaultValue={initialSettings.emailQuota} />
        </div>
        <div className="form-group">
          <label htmlFor="smsQuota" style={{ fontWeight: 600 }}>Quota SMS / jour</label>
          <input type="number" id="smsQuota" name="smsQuota" className="form-control" defaultValue={initialSettings.smsQuota} />
        </div>
      </div>

      {state.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>Paramètres d'envoi mis à jour.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          <Save size={18} style={{ marginRight: '0.5rem' }} />
          {isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}
