'use client'

import { useState, useTransition, useEffect } from 'react'
import { upsertWeeklyStatus } from '../actions'

const STATUSES = [
  { value: 'PARIS', label: 'AN (Paris)' },
  { value: 'CIRCO', label: 'Circonscription' },
  { value: 'TELETRAVAIL', label: 'Télétravail' },
  { value: 'DEPLACEMENT', label: 'Déplacement' },
  { value: 'CONGE', label: 'Congé' },
  { value: 'MALADIE', label: 'Maladie' },
  { value: 'ABSENT', label: 'Absent' },
]

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

export default function PlanningEditForm({ users, weekDates, allStatuses }: { users: any[], weekDates: string[], allStatuses: any[] }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '')
  const [weekData, setWeekData] = useState(weekDates.map(d => ({ dateStr: d, status: '' })))
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)

  // Quand on change d'utilisateur, on met à jour les selects avec ses statuts existants
  useEffect(() => {
    if (!selectedUserId) return

    const newWeekData = weekDates.map(dateStr => {
      const existingStatus = allStatuses.find(s => 
        s.employeeId === selectedUserId && 
        new Date(s.date).toISOString() === dateStr
      )
      return { dateStr, status: existingStatus ? existingStatus.status : '' }
    })
    setWeekData(newWeekData)
    setSuccess(false)
  }, [selectedUserId, weekDates, allStatuses])

  const handleStatusChange = (index: number, status: string) => {
    const newData = [...weekData]
    newData[index].status = status
    setWeekData(newData)
    setSuccess(false)
  }

  const handleSave = () => {
    if (!selectedUserId) return
    startTransition(async () => {
      await upsertWeeklyStatus(selectedUserId, weekData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="userId">Collaborateur à gérer</label>
        <select 
          id="userId" 
          className="form-control" 
          value={selectedUserId} 
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {weekData.map((dayData, index) => {
          const dateObj = new Date(dayData.dateStr)
          return (
            <div key={dayData.dateStr} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{DAYS[index]}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </div>
              </div>
              <select 
                className="form-control" 
                value={dayData.status} 
                onChange={(e) => handleStatusChange(index, e.target.value)}
              >
                <option value="">-- Non renseigné --</option>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
        {success && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>Enregistré avec succès !</span>}
        <button className="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer la semaine'}
        </button>
      </div>
    </div>
  )
}
