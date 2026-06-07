'use client'

import { useState, useTransition } from 'react'
import { toggleModule } from './module-actions'
import { Users, CheckSquare, Mail, Landmark, Calendar } from 'lucide-react'

export default function ModuleEditor({ modules }: { modules: any[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {modules.map(mod => (
        <ModuleCard key={mod.id} mod={mod} />
      ))}
    </div>
  )
}

function ModuleCard({ mod }: { mod: any }) {
  const [isActive, setIsActive] = useState(mod.isActive)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    if (mod.moduleName === 'CONTACTS' && isActive) {
      alert("Le module Contacts est le cœur du CRM et ne peut pas être désactivé.")
      return
    }

    const newValue = !isActive
    setIsActive(newValue)

    startTransition(async () => {
      const result = await toggleModule(mod.id, newValue)
      if (result.error) {
        alert(result.error)
        setIsActive(!newValue) // rollback
      }
    })
  }

  const getModuleInfo = (name: string) => {
    switch (name) {
      case 'CONTACTS': return { title: 'Base Contacts', desc: 'Gestion des contacts, électeurs et VIPs.', icon: <Users size={24} /> }
      case 'TASKS': return { title: 'Tâches & Dossiers', desc: 'Suivi des demandes et tâches de l\'équipe.', icon: <CheckSquare size={24} /> }
      case 'MAILS': return { title: 'Courriers', desc: 'Numérisation et suivi des courriers physiques.', icon: <Mail size={24} /> }
      case 'QE': return { title: 'Questions Écrites / QAG', desc: 'Gestion du travail parlementaire à l\'Assemblée.', icon: <Landmark size={24} /> }
      case 'PLANNING': return { title: 'Planning Salariés', desc: 'Congés, RTT, et absences des collaborateurs.', icon: <Calendar size={24} /> }
      default: return { title: name, desc: '', icon: <CheckSquare size={24} /> }
    }
  }

  const info = getModuleInfo(mod.moduleName)

  return (
    <div className={`card ${!isActive ? 'grayscale' : ''}`} style={{ display: 'flex', flexDirection: 'column', transition: 'all 0.2s', opacity: isActive ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
        {info.icon}
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{info.title}</h3>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flex: 1, marginBottom: '1.5rem' }}>
        {info.desc}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--success)' : 'var(--text-muted)' }}>
          {isActive ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
        </span>
        <button 
          onClick={handleToggle}
          disabled={isPending || mod.moduleName === 'CONTACTS'}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: (isPending || mod.moduleName === 'CONTACTS') ? 'not-allowed' : 'pointer',
            backgroundColor: isActive ? 'var(--surface)' : 'var(--primary)',
            color: isActive ? 'var(--text-muted)' : 'white',
            border: isActive ? '1px solid var(--border)' : 'none'
          }}
        >
          {isPending ? '...' : (isActive ? 'Désactiver' : 'Activer')}
        </button>
      </div>
    </div>
  )
}
