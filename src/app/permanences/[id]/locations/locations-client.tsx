'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePermanence, addLocation, deleteLocation, updateLocation } from '../../actions'
import { Trash2, Plus, Check, Loader2, Save, AlertTriangle } from 'lucide-react'

type MairieContactData = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
} | null

type LocationData = {
  id: string
  communeId: string | null
  communeName: string
  dateStr: string
  startTime: string | null
  endTime: string | null
  address: string | null
  parkingNotes: string | null
  parkingStatus: string
  mairieContactId: string | null
  mairieContact: MairieContactData
  locationNotes: string | null
}

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

type LocationsClientProps = {
  permanence: {
    id: string
    title: string
    scheduledStartDate: string
    returnDate: string
    notes: string
    ownerUserId: string
    deputyRemarks: string
    locations: LocationData[]
  }
  users: UserData[]
  communes: CommuneData[]
  contacts: ContactData[]
  isReadOnly: boolean
}

export default function LocationsClient({
  permanence,
  users,
  communes,
  contacts,
  isReadOnly
}: LocationsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // General Info states
  const [title, setTitle] = useState(permanence.title)
  const [ownerUserId, setOwnerUserId] = useState(permanence.ownerUserId)
  const [returnDate, setReturnDate] = useState(permanence.returnDate)
  const [generalSaveStatus, setGeneralSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [generalError, setGeneralError] = useState('')

  // Locations state
  const [localLocations, setLocalLocations] = useState<LocationData[]>(permanence.locations)
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Sync state with props when database updates
  useEffect(() => {
    setLocalLocations(permanence.locations)
  }, [permanence.locations])

  // Handle general info save
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setGeneralSaveStatus('saving')
    setGeneralError('')

    const res = await updatePermanence(permanence.id, {
      title,
      scheduledStartDate: new Date(permanence.scheduledStartDate),
      ownerUserId,
      returnDate: returnDate ? new Date(returnDate) : null,
      notes: permanence.notes,
      deputyRemarks: permanence.deputyRemarks
    })

    if (res.success) {
      setGeneralSaveStatus('saved')
      router.refresh()
      setTimeout(() => setGeneralSaveStatus('idle'), 2000)
    } else {
      setGeneralSaveStatus('error')
      setGeneralError(res.error || 'Erreur lors de la sauvegarde.')
    }
  }

  // Handle add location
  const handleAddLocation = async () => {
    if (isReadOnly) return
    setError(null)

    // Add with default/empty values first, then user edits in table
    const defaultCommune = communes[0]
    const defaultName = defaultCommune ? defaultCommune.name : 'Nouvelle commune'
    const defaultCid = defaultCommune ? defaultCommune.id : undefined

    const res = await addLocation(permanence.id, {
      communeId: defaultCid,
      communeName: defaultName,
      date: new Date(permanence.scheduledStartDate),
    })

    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'ajout du lieu.')
    } else {
      router.refresh()
    }
  }

  // Handle delete location
  const handleDeleteLocation = async (id: string) => {
    if (isReadOnly) return
    if (!confirm('Voulez-vous vraiment supprimer ce lieu de passage ?')) return
    setError(null)

    const res = await deleteLocation(permanence.id, id)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la suppression.')
    } else {
      router.refresh()
    }
  }

  // Handle inline change
  const handleFieldChange = (locId: string, field: keyof LocationData, value: any) => {
    setLocalLocations(prev => prev.map(loc => {
      if (loc.id === locId) {
        let updated = { ...loc, [field]: value }
        // If communeId changes, auto-update communeName
        if (field === 'communeId') {
          const matched = communes.find(c => c.id === value)
          if (matched) updated.communeName = matched.name
        }
        return updated
      }
      return loc
    }))
  }

  // Handle row save
  const handleSaveRow = async (locId: string) => {
    const loc = localLocations.find(l => l.id === locId)
    if (!loc) return

    setSavingRows(prev => ({ ...prev, [locId]: true }))
    setError(null)

    const res = await updateLocation(permanence.id, locId, {
      communeId: loc.communeId,
      communeName: loc.communeName,
      date: new Date(loc.dateStr),
      startTime: loc.startTime || null,
      endTime: loc.endTime || null,
      address: loc.address || null,
      parkingNotes: loc.parkingNotes || null,
      parkingStatus: loc.parkingStatus as any,
      mairieContactId: loc.mairieContactId || null,
      locationNotes: loc.locationNotes || null
    })

    setSavingRows(prev => ({ ...prev, [locId]: false }))

    if (!res.success) {
      setError(res.error || 'Erreur lors de la sauvegarde de la ligne.')
    } else {
      router.refresh()
    }
  }

  // Helper to check if row is modified (dirty)
  const isRowDirty = (locId: string) => {
    const local = localLocations.find(l => l.id === locId)
    const initial = permanence.locations.find(l => l.id === locId)
    if (!local || !initial) return false

    return (
      local.communeId !== initial.communeId ||
      local.dateStr !== initial.dateStr ||
      (local.startTime || '') !== (initial.startTime || '') ||
      (local.endTime || '') !== (initial.endTime || '') ||
      (local.address || '') !== (initial.address || '') ||
      (local.parkingNotes || '') !== (initial.parkingNotes || '') ||
      local.parkingStatus !== initial.parkingStatus ||
      (local.mairieContactId || '') !== (initial.mairieContactId || '') ||
      (local.locationNotes || '') !== (initial.locationNotes || '')
    )
  }

  return (
    <div>
      {/* 1. IDENTIFICATION FORM */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', backgroundColor: 'white' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>
          Identification de la permanence
        </h2>
        
        {generalError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSaveGeneral}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Intitulé du dossier</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="form-control"
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Nombre de villes prévues</label>
              <input 
                type="text" 
                value={localLocations.length} 
                className="form-control" 
                disabled 
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Collaborateur responsable</label>
              <select 
                value={ownerUserId} 
                onChange={e => setOwnerUserId(e.target.value)} 
                className="form-control"
                disabled={isReadOnly}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Date de remise</label>
              <input 
                type="date" 
                value={returnDate} 
                onChange={e => setReturnDate(e.target.value)} 
                className="form-control"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                type="submit" 
                className="button"
                disabled={generalSaveStatus === 'saving'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem' }}
              >
                {generalSaveStatus === 'saving' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Sauvegarder les infos générales
                  </>
                )}
              </button>
              {generalSaveStatus === 'saved' && (
                <span style={{ color: 'var(--success)', alignSelf: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                  Enregistré !
                </span>
              )}
            </div>
          )}
        </form>
      </div>

      {/* 2. LOCATIONS TABLE SECTION */}
      <div className="card" style={{ padding: '2rem', backgroundColor: 'white', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              Lieux de passage ({localLocations.length} / {localLocations.length})
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Chaque ville peut avoir son propre horaire, emplacement camion, adresse et suivi mairie.
            </p>
          </div>
          
          {!isReadOnly && (
            <button 
              onClick={handleAddLocation} 
              className="button outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', height: '36px' }}
            >
              <Plus size={16} /> Ajouter une ville
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '1300px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem', width: '220px', fontWeight: 600, color: '#475569' }}>COMMUNE</th>
                <th style={{ padding: '0.75rem 1rem', width: '140px', fontWeight: 600, color: '#475569' }}>DATE</th>
                <th style={{ padding: '0.75rem 1rem', width: '160px', fontWeight: 600, color: '#475569' }}>HORAIRES</th>
                <th style={{ padding: '0.75rem 1rem', width: '180px', fontWeight: 600, color: '#475569' }}>LIEU PRÉCIS</th>
                <th style={{ padding: '0.75rem 1rem', width: '180px', fontWeight: 600, color: '#475569' }}>ADRESSE</th>
                <th style={{ padding: '0.75rem 1rem', width: '140px', fontWeight: 600, color: '#475569' }}>STATIONNEMENT</th>
                <th style={{ padding: '0.75rem 1rem', width: '200px', fontWeight: 600, color: '#475569' }}>CONTACT MAIRIE</th>
                <th style={{ padding: '0.75rem 1rem', width: '200px', fontWeight: 600, color: '#475569' }}>NOTES</th>
                {!isReadOnly && <th style={{ padding: '0.75rem 1rem', width: '100px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {localLocations.map((loc) => {
                const rowDirty = isRowDirty(loc.id)
                const rowSaving = savingRows[loc.id]

                return (
                  <tr key={loc.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: rowDirty ? '#fffbeb' : 'white', transition: 'background-color 0.2s' }}>
                    {/* Commune selector */}
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={loc.communeId || ''}
                        onChange={e => handleFieldChange(loc.id, 'communeId', e.target.value)}
                        className="form-control"
                        disabled={isReadOnly}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Choisir commune --</option>
                        {communes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Date picker */}
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="date"
                        value={loc.dateStr}
                        onChange={e => handleFieldChange(loc.id, 'dateStr', e.target.value)}
                        className="form-control"
                        disabled={isReadOnly}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      />
                    </td>

                    {/* Horaires (Start and End times) */}
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="time"
                          value={loc.startTime || ''}
                          onChange={e => handleFieldChange(loc.id, 'startTime', e.target.value)}
                          className="form-control"
                          disabled={isReadOnly}
                          style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '70px' }}
                        />
                        <span style={{ color: '#94a3b8' }}>à</span>
                        <input
                          type="time"
                          value={loc.endTime || ''}
                          onChange={e => handleFieldChange(loc.id, 'endTime', e.target.value)}
                          className="form-control"
                          disabled={isReadOnly}
                          style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: '70px' }}
                        />
                      </div>
                    </td>

                    {/* Lieu Précis */}
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={loc.address || ''}
                        onChange={e => handleFieldChange(loc.id, 'address', e.target.value)}
                        className="form-control"
                        placeholder="Ex: Face mairie"
                        disabled={isReadOnly}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      />
                    </td>

                    {/* Adresse */}
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={loc.parkingNotes || ''}
                        onChange={e => handleFieldChange(loc.id, 'parkingNotes', e.target.value)}
                        className="form-control"
                        placeholder="Rue..."
                        disabled={isReadOnly}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      />
                    </td>

                    {/* Stationnement (parkingStatus) */}
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={loc.parkingStatus}
                        onChange={e => handleFieldChange(loc.id, 'parkingStatus', e.target.value)}
                        className="form-control"
                        disabled={isReadOnly}
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
                        value={loc.mairieContactId || ''}
                        onChange={e => handleFieldChange(loc.id, 'mairieContactId', e.target.value)}
                        className="form-control"
                        disabled={isReadOnly}
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
                        value={loc.locationNotes || ''}
                        onChange={e => handleFieldChange(loc.id, 'locationNotes', e.target.value)}
                        className="form-control"
                        placeholder="Observations..."
                        disabled={isReadOnly}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      />
                    </td>

                    {/* Actions */}
                    {!isReadOnly && (
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleSaveRow(loc.id)}
                            disabled={!rowDirty || rowSaving}
                            className="button"
                            title="Sauvegarder la ligne"
                            style={{ 
                              padding: '0.25rem', width: '28px', height: '28px', borderRadius: '4px',
                              backgroundColor: rowDirty ? 'var(--success)' : '#e2e8f0', 
                              color: rowDirty ? 'white' : '#94a3b8',
                              border: 'none',
                              cursor: rowDirty ? 'pointer' : 'default',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {rowSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            style={{ 
                              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', 
                              padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
