'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPermanence } from '../actions'
import { Plus, Trash2, Calendar, User, Clock, MapPin, AlertTriangle, FileText, Info } from 'lucide-react'

type CommuneData = {
  id: string
  name: string
  zipCode: string
}

type ContactData = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  city: string | null
}

type UserData = {
  id: string
  name: string
}

type LocationItem = {
  id: string
  communeId: string
  communeNameFree: string
  communeName: string
  dateStr: string
  startTime: string
  endTime: string
  address: string
  parkingNotes: string
  parkingStatus: 'TODO' | 'IN_PROGRESS' | 'DONE'
  mairieContactId: string
  locationNotes: string
}

export default function PermanenceForm({ 
  communes, 
  users = [], 
  contacts = [],
  fieldConfig = {} 
}: { 
  communes: CommuneData[]
  users?: UserData[]
  contacts?: ContactData[]
  fieldConfig?: Record<string, any> 
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createPermanence, { success: false })

  // General fields state
  const todayStr = new Date().toISOString().split('T')[0]
  const [scheduledStartDate, setScheduledStartDate] = useState(todayStr)
  
  // Format date to DD/MM/YYYY for the automatic title
  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const [title, setTitle] = useState(`Permanence du ${formatDateFr(todayStr)}`)
  const [titleEdited, setTitleEdited] = useState(false)
  const [ownerUserId, setOwnerUserId] = useState(users[0]?.id || '')
  const [returnDate, setReturnDate] = useState('')
  const [notes, setNotes] = useState('')

  // Locations state
  const [locations, setLocations] = useState<LocationItem[]>([
    {
      id: '1',
      communeId: '',
      communeNameFree: '',
      communeName: '',
      dateStr: todayStr,
      startTime: '09:00',
      endTime: '12:00',
      address: '',
      parkingNotes: '',
      parkingStatus: 'TODO',
      mairieContactId: '',
      locationNotes: ''
    }
  ])

  // Redirect on success
  useEffect(() => {
    if (state.success && state.data?.id) {
      router.push(`/permanences/${state.data.id}`)
    }
  }, [state, router])

  // Handle main date change and propagate to locations
  const handleMainDateChange = (newDate: string) => {
    const oldDate = scheduledStartDate
    setScheduledStartDate(newDate)
    
    if (!titleEdited) {
      setTitle(`Permanence du ${formatDateFr(newDate)}`)
    }

    setLocations(prev => prev.map(loc => {
      // If the location date was empty or matched the old main date, update it
      if (loc.dateStr === oldDate || !loc.dateStr) {
        return { ...loc, dateStr: newDate }
      }
      return loc
    }))
  }

  // Handle local change in locations table
  const handleLocationFieldChange = (id: string, field: keyof LocationItem, value: any) => {
    setLocations(prev => prev.map(loc => {
      if (loc.id === id) {
        let updated = { ...loc, [field]: value }
        
        if (field === 'communeId') {
          if (value === 'FREE') {
            updated.communeName = updated.communeNameFree || ''
          } else {
            const c = communes.find(x => x.id === value)
            if (c) {
              updated.communeName = c.name
              updated.communeNameFree = ''
            }
          }
        } else if (field === 'communeNameFree' && loc.communeId === 'FREE') {
          updated.communeName = value
        }
        
        return updated
      }
      return loc
    }))
  }

  // Add location row
  const handleAddLocation = () => {
    const defaultCommune = communes[0]
    const defaultId = defaultCommune ? defaultCommune.id : ''
    const defaultName = defaultCommune ? defaultCommune.name : ''

    const newLoc: LocationItem = {
      id: Date.now().toString(),
      communeId: defaultId,
      communeNameFree: '',
      communeName: defaultName,
      dateStr: scheduledStartDate,
      startTime: '',
      endTime: '',
      address: '',
      parkingNotes: '',
      parkingStatus: 'TODO',
      mairieContactId: '',
      locationNotes: ''
    }

    setLocations(prev => [...prev, newLoc])
  }

  // Delete location row
  const handleDeleteLocation = (id: string) => {
    if (locations.length === 1) {
      alert("Il doit y avoir au moins un lieu de passage.")
      return
    }
    setLocations(prev => prev.filter(loc => loc.id !== id))
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. GENERAL INFORMATION */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>
          Identification de la permanence
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Intitulé */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
              Intitulé du dossier *
            </label>
            <input 
              type="text" 
              name="title"
              value={title} 
              onChange={e => {
                setTitle(e.target.value)
                setTitleEdited(true)
              }} 
              className="form-control"
              required
              placeholder="Ex: Permanence du 19/06/2026"
            />
          </div>

          {/* Nombre de villes prévues */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
              Nombre de villes prévues
            </label>
            <input 
              type="text" 
              value={locations.length} 
              className="form-control" 
              disabled 
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold' }}
            />
          </div>

          {/* Collaborateur responsable */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
              Collaborateur responsable
            </label>
            <select 
              name="ownerUserId"
              value={ownerUserId} 
              onChange={e => setOwnerUserId(e.target.value)} 
              className="form-control"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Date de la permanence */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
              Date de la permanence *
            </label>
            <input 
              type="date" 
              name="scheduledStartDate"
              value={scheduledStartDate} 
              onChange={e => handleMainDateChange(e.target.value)} 
              className="form-control"
              required
            />
          </div>

          {/* Date de remise */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
              Date de remise
            </label>
            <input 
              type="date" 
              name="returnDate"
              value={returnDate} 
              onChange={e => setReturnDate(e.target.value)} 
              className="form-control"
            />
          </div>
        </div>

        {/* Notes globales */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
            Notes de préparation / Détails
          </label>
          <textarea 
            name="notes"
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows={2}
            className="form-control"
            placeholder="Informations ou remarques sur l'organisation globale de la journée..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      {/* 2. LOCATIONS TABLE SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              Lieux de passage ({locations.length} / {locations.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Chaque ville peut avoir son propre horaire, emplacement camion, adresse et suivi mairie.
            </p>
          </div>
          
          <button 
            type="button"
            onClick={handleAddLocation} 
            className="button outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', height: '36px' }}
          >
            <Plus size={16} /> Ajouter une ville
          </button>
        </div>

        {/* Hidden inputs to pass data to Server Action */}
        <input type="hidden" name="locations" value={JSON.stringify(locations)} />

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '1300px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', width: '220px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>COMMUNE</th>
                <th style={{ padding: '0.75rem 1rem', width: '140px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>DATE</th>
                <th style={{ padding: '0.75rem 1rem', width: '160px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>HORAIRES</th>
                <th style={{ padding: '0.75rem 1rem', width: '180px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>LIEU PRÉCIS</th>
                <th style={{ padding: '0.75rem 1rem', width: '180px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>ADRESSE</th>
                <th style={{ padding: '0.75rem 1rem', width: '140px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>STATIONNEMENT</th>
                <th style={{ padding: '0.75rem 1rem', width: '200px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>CONTACT MAIRIE</th>
                <th style={{ padding: '0.75rem 1rem', width: '200px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>NOTES</th>
                <th style={{ padding: '0.75rem 1rem', width: '80px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, idx) => (
                <tr key={loc.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                  
                  {/* Commune selector */}
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      value={loc.communeId}
                      onChange={e => handleLocationFieldChange(loc.id, 'communeId', e.target.value)}
                      className="form-control"
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      required
                    >
                      <option value="">-- Choisir commune --</option>
                      {communes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.zipCode})</option>
                      ))}
                      <option value="FREE">-- Autre (Saisie libre) --</option>
                    </select>
                    {loc.communeId === 'FREE' && (
                      <input
                        type="text"
                        value={loc.communeNameFree}
                        onChange={e => handleLocationFieldChange(loc.id, 'communeNameFree', e.target.value)}
                        className="form-control"
                        placeholder="Nom de la commune..."
                        style={{ height: '30px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                        required
                      />
                    )}
                  </td>

                  {/* Date picker */}
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="date"
                      value={loc.dateStr}
                      onChange={e => handleLocationFieldChange(loc.id, 'dateStr', e.target.value)}
                      className="form-control"
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      required
                    />
                  </td>

                  {/* Horaires */}
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="time"
                        value={loc.startTime}
                        onChange={e => handleLocationFieldChange(loc.id, 'startTime', e.target.value)}
                        className="form-control"
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '70px' }}
                      />
                      <span style={{ color: '#94a3b8' }}>à</span>
                      <input
                        type="time"
                        value={loc.endTime}
                        onChange={e => handleLocationFieldChange(loc.id, 'endTime', e.target.value)}
                        className="form-control"
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '70px' }}
                      />
                    </div>
                  </td>

                  {/* Lieu Précis */}
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="text"
                      value={loc.address}
                      onChange={e => handleLocationFieldChange(loc.id, 'address', e.target.value)}
                      className="form-control"
                      placeholder="Ex: Face mairie"
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Adresse */}
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="text"
                      value={loc.parkingNotes}
                      onChange={e => handleLocationFieldChange(loc.id, 'parkingNotes', e.target.value)}
                      className="form-control"
                      placeholder="Rue..."
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Stationnement */}
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      value={loc.parkingStatus}
                      onChange={e => handleLocationFieldChange(loc.id, 'parkingStatus', e.target.value)}
                      className="form-control"
                      style={{ 
                        height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem',
                        backgroundColor: loc.parkingStatus === 'DONE' ? '#d1fae5' : loc.parkingStatus === 'IN_PROGRESS' ? '#fef3c7' : '#fee2e2',
                        color: loc.parkingStatus === 'DONE' ? '#065f46' : loc.parkingStatus === 'IN_PROGRESS' ? '#92400e' : '#991b1b',
                        fontWeight: 600
                      }}
                    >
                      <option value="TODO">NON FAIT</option>
                      <option value="IN_PROGRESS">EN COURS</option>
                      <option value="DONE">FAIT</option>
                    </select>
                  </td>

                  {/* Contact Mairie */}
                  <td style={{ padding: '0.5rem' }}>
                    <select
                      value={loc.mairieContactId}
                      onChange={e => handleLocationFieldChange(loc.id, 'mairieContactId', e.target.value)}
                      className="form-control"
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="">-- Choisir contact --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.lastName} {c.firstName}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Notes */}
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="text"
                      value={loc.locationNotes}
                      onChange={e => handleLocationFieldChange(loc.id, 'locationNotes', e.target.value)}
                      className="form-control"
                      placeholder="Observations..."
                      style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id)}
                      disabled={locations.length === 1}
                      style={{ 
                        background: 'none', border: 'none', 
                        cursor: locations.length === 1 ? 'not-allowed' : 'pointer', 
                        color: locations.length === 1 ? '#cbd5e1' : '#ef4444', 
                        padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: 'auto'
                      }}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
          <AlertTriangle size={16} /> {state.error}
        </div>
      )}

      {/* FOOTER ACTIONS */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="button outline"
          style={{ flex: 1, height: '42px' }}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          disabled={isPending} 
          className="button"
          style={{ flex: 2, height: '42px' }}
        >
          {isPending ? 'Création de la permanence...' : 'Créer la permanence'}
        </button>
      </div>
    </form>
  )
}
