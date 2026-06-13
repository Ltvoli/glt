'use client'

import { useActionState } from 'react'
import { saveWorkspaceSettings } from './workspace-actions'
import { Save, ShieldAlert, CheckCircle2, AlertTriangle, Smartphone, ShieldCheck } from 'lucide-react'

type WorkspaceSettings = {
  name: string
  logoUrl: string | null
  force2FA: boolean
  ipAllowlist: string | null
  sessionTimeoutMinutes: number
  mobileAccessEnabled: boolean
}

type WorkspaceFormProps = {
  initialSettings: WorkspaceSettings
}

const initialState = {
  success: false,
  error: ''
}

export default function WorkspaceForm({ initialSettings }: WorkspaceFormProps) {
  const [state, formAction, isPending] = useActionState(saveWorkspaceSettings as any, initialState)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {state.success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          backgroundColor: '#e6f4ea',
          color: '#137333',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          fontWeight: '500'
        }}>
          <CheckCircle2 size={20} />
          Paramètres enregistrés avec succès.
        </div>
      )}

      {state.error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          backgroundColor: '#fce8e6',
          color: '#c5221f',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          fontWeight: '500'
        }}>
          <AlertTriangle size={20} />
          {state.error}
        </div>
      )}

      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2Icon /> Informations Générales
        </h3>
        
        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Nom de l'espace de travail
          </label>
          <input 
            type="text" 
            name="name" 
            className="form-control"
            defaultValue={initialSettings.name}
            required
            placeholder="Ex: Bureau Parlementaire - Lionel Tivoli"
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            Ce nom apparaîtra sur la barre latérale et sur l'en-tête de l'application.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} style={{ color: 'var(--primary)' }} /> Sécurité et Authentification
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              name="force2FA" 
              defaultChecked={initialSettings.force2FA}
              style={{ marginTop: '0.2rem' }}
            />
            <div>
              <span style={{ fontWeight: '600', fontSize: '0.925rem', display: 'block' }}>
                Forcer la double authentification (2FA)
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                Tous les membres devront obligatoirement configurer et utiliser le 2FA TOTP pour se connecter.
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              name="mobileAccessEnabled" 
              defaultChecked={initialSettings.mobileAccessEnabled}
              style={{ marginTop: '0.2rem' }}
            />
            <div>
              <span style={{ fontWeight: '600', fontSize: '0.925rem', display: 'block' }}>
                Autoriser l'accès depuis l'application mobile
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                Permet aux coordinateurs et superviseurs d'accéder au module mobile de permanences.
              </span>
            </div>
          </label>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Durée de vie des sessions (minutes)
          </label>
          <input 
            type="number" 
            name="sessionTimeoutMinutes" 
            className="form-control"
            defaultValue={initialSettings.sessionTimeoutMinutes}
            min={15}
            max={43200}
            required
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            Durée après laquelle un utilisateur inactif sera automatiquement déconnecté (1440 min = 24 heures).
          </p>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Restriction par adresse IP (Optionnel)
          </label>
          <textarea 
            name="ipAllowlist" 
            className="form-control"
            defaultValue={initialSettings.ipAllowlist || ''}
            rows={2}
            placeholder="Ex: 192.168.1.1, 82.10.12.34"
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            Séparez les adresses IP autorisées par des virgules. Laissez vide pour autoriser toutes les connexions.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          type="submit" 
          disabled={isPending}
          className="button"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} />
          {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

    </form>
  )
}

function Building2Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2Z"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2Z"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
  )
}
