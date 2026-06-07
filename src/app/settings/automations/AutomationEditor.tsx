'use client'

import { useState, useTransition } from 'react'
import { toggleAutomation } from './automation-actions'
import { Zap, Clock, Bell, UserX } from 'lucide-react'

export default function AutomationEditor({ rules }: { rules: any[] }) {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {rules.map(rule => (
        <AutomationRow key={rule.id} rule={rule} />
      ))}
    </div>
  )
}

function AutomationRow({ rule }: { rule: any }) {
  const [isActive, setIsActive] = useState(rule.isActive)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newValue = !isActive
    setIsActive(newValue)

    startTransition(async () => {
      const result = await toggleAutomation(rule.id, newValue)
      if (result.error) {
        alert(result.error)
        setIsActive(!newValue) // rollback
      }
    })
  }

  const getIcon = (description: string) => {
    switch (description) {
      case 'Envoi des rappels': return <Clock size={20} style={{ color: 'var(--warning-dark)' }} />
      case 'RGPD Inactif': return <UserX size={20} style={{ color: 'var(--danger)' }} />
      case 'Notif': return <Bell size={20} style={{ color: 'var(--primary)' }} />
      default: return <Zap size={20} />
    }
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isActive ? 1 : 0.6, transition: 'opacity 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
          {getIcon(rule.description)}
        </div>
        <div>
          <h4 style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}>{rule.name}</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, marginTop: '0.25rem' }}>
            Déclencheur : <span style={{ fontFamily: 'monospace' }}>{rule.frequency}</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--success)' : 'var(--text-muted)' }}>
          {isActive ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
        </span>
        
        {/* Toggle Switch Simple */}
        <label style={{ display: 'flex', alignItems: 'center', cursor: isPending ? 'wait' : 'pointer' }}>
          <input 
            type="checkbox" 
            checked={isActive} 
            onChange={handleToggle} 
            disabled={isPending}
            style={{ width: '24px', height: '24px', accentColor: 'var(--primary)' }} 
          />
        </label>
      </div>
    </div>
  )
}
