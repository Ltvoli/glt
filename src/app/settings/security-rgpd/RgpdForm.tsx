'use client'

import { useActionState } from 'react'
import { updateRgpdSettings } from './rgpd-actions'
import { Save } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function RgpdForm({ initialSettings }: { initialSettings: any }) {
  const [state, formAction, isPending] = useActionState(updateRgpdSettings, initialState)

  return (
    <form action={formAction} className="card" style={{ maxWidth: '800px' }}>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="dpoEmail" style={{ fontWeight: 600 }}>Email du DPO (Délégué à la Protection des Données)</label>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Adresse email de contact affichée pour les demandes de suppression/rectification.</p>
        <input type="email" id="dpoEmail" name="dpoEmail" className="form-control" defaultValue={initialSettings.dpoEmail} placeholder="dpo@assemblee-nationale.fr" />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Durées de conservation (Rétention)</h3>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="retentionContacts" style={{ fontWeight: 600 }}>Contacts inactifs (en mois)</label>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Durée après laquelle un contact sans interaction doit être anonymisé ou supprimé (CNIL : 36 mois max par défaut).</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" id="retentionContacts" name="retentionContacts" className="form-control" defaultValue={initialSettings.retentionContacts} style={{ maxWidth: '100px' }} />
          <span>mois</span>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="retentionLogs" style={{ fontWeight: 600 }}>Historique d'audit (en jours)</label>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Durée de conservation des journaux d'activité (AuditLogs) prouvant les consentements et modifications.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" id="retentionLogs" name="retentionLogs" className="form-control" defaultValue={initialSettings.retentionLogs} style={{ maxWidth: '100px' }} />
          <span>jours</span>
        </div>
      </div>

      {state.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>Paramètres RGPD enregistrés avec succès.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          <Save size={18} style={{ marginRight: '0.5rem' }} />
          {isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}
