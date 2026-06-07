'use client'

import { useActionState } from 'react'
import { updatePlanningSettings } from './planning-actions'
import { Save } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function PlanningForm({ initialSettings }: { initialSettings: any }) {
  const [state, formAction, isPending] = useActionState(updatePlanningSettings, initialState)

  return (
    <form action={formAction} className="card" style={{ maxWidth: '600px' }}>
      
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Quotas Annuels</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Ces valeurs serviront de base pour calculer les soldes de congés de tous les collaborateurs sur l'année civile en cours.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="totalCP" style={{ fontWeight: 600 }}>Total Congés Payés (Jours)</label>
          <input type="number" id="totalCP" name="totalCP" className="form-control" defaultValue={initialSettings.totalCP} />
        </div>
        <div className="form-group">
          <label htmlFor="totalRTT" style={{ fontWeight: 600 }}>Total RTT (Jours)</label>
          <input type="number" id="totalRTT" name="totalRTT" className="form-control" defaultValue={initialSettings.totalRTT} />
        </div>
      </div>

      {state.error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{state.error}</p>}
      {state.success && <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>Paramètres du planning enregistrés avec succès.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          <Save size={18} style={{ marginRight: '0.5rem' }} />
          {isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}
