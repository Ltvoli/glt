'use client'

import { useActionState } from 'react'
import { updateIntegration } from './integration-actions'
import { Check, Mail, MessageSquare, Database } from 'lucide-react'

const initialState: any = { error: '', success: false }

export default function IntegrationEditor({ integrations }: { integrations: any[] }) {
  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {integrations.map(integration => (
        <IntegrationForm key={integration.id} integration={integration} />
      ))}
    </div>
  )
}

function IntegrationForm({ integration }: { integration: any }) {
  const [state, formAction, isPending] = useActionState(updateIntegration, initialState)

  let apiKey = ''
  try {
    if (integration.secrets) {
      const parsed = JSON.parse(integration.secrets)
      if (parsed.apiKey) apiKey = parsed.apiKey
    }
  } catch (e) {}

  return (
    <form action={formAction} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ProviderIcon provider={integration.provider} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {integration.provider === 'BREVO' && 'Brevo (E-mails & SMS)'}
            {integration.provider === 'WHATSAPP' && 'API WhatsApp Business'}
            {integration.provider === 'QOMON' && 'Synchronisation Qomon'}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor={`isActive-${integration.id}`} style={{ fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            Activer
          </label>
          <input 
            type="checkbox" 
            id={`isActive-${integration.id}`} 
            name="isActive" 
            value="true" 
            defaultChecked={integration.isActive} 
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {integration.provider === 'BREVO' && "Clé d'API V3 fournie par Brevo (Sendinblue) pour envoyer les campagnes et notifications."}
        {integration.provider === 'WHATSAPP' && "Clé d'accès Meta Graph API pour l'envoi de templates WhatsApp."}
        {integration.provider === 'QOMON' && "Jeton de synchronisation pour remonter les contacts terrain depuis Qomon vers ce CRM."}
      </p>

      <input type="hidden" name="id" value={integration.id} />
      
      <div className="form-group">
        <label htmlFor={`apiKey-${integration.id}`}>Clé d'API Secrète</label>
        <input 
          type="password" 
          id={`apiKey-${integration.id}`} 
          name="apiKey" 
          className="form-control" 
          defaultValue={apiKey} 
          placeholder="••••••••••••••••••••••••"
        />
      </div>

      {state.error && <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{state.error}</span>}
      {state.success && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>Configuration enregistrée.</span>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          <Check size={18} style={{ marginRight: '0.5rem' }} />
          {isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case 'BREVO': return <Mail size={24} style={{ color: 'var(--primary)' }} />
    case 'WHATSAPP': return <MessageSquare size={24} style={{ color: '#22c55e' }} />
    case 'QOMON': return <Database size={24} style={{ color: '#f59e0b' }} />
    default: return <Database size={24} />
  }
}
