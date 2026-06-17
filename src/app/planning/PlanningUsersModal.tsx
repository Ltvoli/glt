'use client'

import { useState, useTransition, useEffect } from 'react'
import { Settings, X, Eye, EyeOff } from 'lucide-react'
import { upsertEmployeeSetting } from './actions'

type UserData = {
  id: string
  name: string
  email: string
  showInPlanning: boolean
  counters: { annualDays: number }
}

export default function PlanningUsersModal({ users }: { users: UserData[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Local state for optimistic updates within the modal
  const [localUsers, setLocalUsers] = useState(users)

  // Sync state with props when the modal opens or when props change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setLocalUsers(users)
      }, 0)
    }
  }, [isOpen, users])

  const handleToggleVisibility = (userId: string, currentDays: number, currentShow: boolean) => {
    const newShow = !currentShow
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, showInPlanning: newShow } : u))
    startTransition(async () => {
      await upsertEmployeeSetting(userId, currentDays, newShow)
    })
  }

  const handleUpdateDays = (userId: string, currentShow: boolean, newDaysStr: string) => {
    const newDays = parseInt(newDaysStr)
    if (isNaN(newDays)) return
    
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, counters: { ...u.counters, annualDays: newDays } } : u))
    startTransition(async () => {
      await upsertEmployeeSetting(userId, newDays, currentShow)
    })
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Settings size={16} /> Gérer les collaborateurs
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'white', position: 'relative' }}>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Gestion des Collaborateurs
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Définissez le quota annuel de chaque collaborateur ou masquez-les du planning.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {localUsers.map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: emp.showInPlanning ? '#f8fafc' : '#f1f5f9', opacity: emp.showInPlanning ? 1 : 0.6, borderRadius: '8px', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={() => handleToggleVisibility(emp.id, emp.counters.annualDays, emp.showInPlanning)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emp.showInPlanning ? 'var(--primary)' : 'var(--text-muted)' }}
                      title={emp.showInPlanning ? "Masquer du planning" : "Afficher dans le planning"}
                      disabled={isPending}
                    >
                      {emp.showInPlanning ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', textDecoration: emp.showInPlanning ? 'none' : 'line-through' }}>{emp.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Quota :</label>
                    <input 
                      type="number" 
                      defaultValue={emp.counters.annualDays} 
                      onBlur={e => handleUpdateDays(emp.id, emp.showInPlanning, e.target.value)}
                      disabled={isPending}
                      className="form-control" 
                      style={{ width: '70px', margin: 0, padding: '0.25rem 0.5rem', height: '30px' }} 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>j/an</span>
                  </div>
                </div>
              ))}
            </div>
            
            {isPending && (
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Sauvegarde en cours...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
