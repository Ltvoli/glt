'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLocation, deleteLocation, updateParkingStatus, updateLocationDetails } from '../../actions'
import { Trash2, Plus, MapPin, Calendar, Clock, Check, Phone, User, FileText, ChevronDown, ChevronUp, Building2 } from 'lucide-react'

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
  date: Date
  startTime: string | null
  endTime: string | null
  address: string | null
  parkingStatus: string
  parkingNotes: string | null
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

type LocationsClientProps = {
  permanenceId: string
  locations: LocationData[]
  communes: CommuneData[]
  contacts: ContactData[]
  isReadOnly: boolean
}

const PARKING_STATUS_LABELS: Record<string, string> = {
  TODO: 'À confirmer',
  IN_PROGRESS: 'En cours',
  DONE: 'Confirmé',
}
const PARKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  TODO: { bg: '#fee2e2', text: '#991b1b' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
  DONE: { bg: '#d1fae5', text: '#065f46' },
}

export default function LocationsClient({
  permanenceId,
  locations,
  communes,
  contacts,
  isReadOnly
}: LocationsClientProps) {
  const router = useRouter()
  const [selectedCommuneId, setSelectedCommuneId] = useState('')
  const [communeNameFree, setCommuneNameFree] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)

  // Detail edit state per location
  const [detailEdits, setDetailEdits] = useState<Record<string, {
    mairieContactId: string
    locationNotes: string
    saving: boolean
  }>>({})

  const initDetailEdit = (loc: LocationData) => {
    if (!detailEdits[loc.id]) {
      setDetailEdits(prev => ({
        ...prev,
        [loc.id]: {
          mairieContactId: loc.mairieContactId || '',
          locationNotes: loc.locationNotes || '',
          saving: false,
        }
      }))
    }
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!selectedCommuneId && !communeNameFree.trim()) return
    if (!dateStr) return

    setLoading(true)
    setError(null)

    let name = communeNameFree
    let cid: string | undefined = undefined
    if (selectedCommuneId) {
      const c = communes.find(c => c.id === selectedCommuneId)
      if (c) { name = c.name; cid = c.id }
    }

    const res = await addLocation(permanenceId, {
      communeId: cid,
      communeName: name,
      date: new Date(dateStr),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      address: address || undefined,
    })

    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'ajout du lieu.')
    } else {
      setSelectedCommuneId('')
      setCommuneNameFree('')
      setDateStr('')
      setStartTime('')
      setEndTime('')
      setAddress('')
      router.refresh()
    }
    setLoading(false)
  }

  const handleDelete = async (locationId: string) => {
    if (isReadOnly) return
    if (!confirm('Supprimer ce lieu ?')) return
    await deleteLocation(permanenceId, locationId)
    router.refresh()
  }

  const handleParkingStatus = async (locationId: string, status: string) => {
    if (isReadOnly) return
    await updateParkingStatus(permanenceId, locationId, status as any)
    router.refresh()
  }

  const handleSaveDetails = async (locId: string) => {
    const edit = detailEdits[locId]
    if (!edit) return
    setDetailEdits(prev => ({ ...prev, [locId]: { ...prev[locId], saving: true } }))
    await updateLocationDetails(permanenceId, locId, {
      mairieContactId: edit.mairieContactId || null,
      locationNotes: edit.locationNotes || null,
    })
    setDetailEdits(prev => ({ ...prev, [locId]: { ...prev[locId], saving: false } }))
    router.refresh()
  }

  return (
    <div>
      {/* ADD FORM */}
      {!isReadOnly && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
            Ajouter un lieu de passage
          </h3>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px' }}>{error}</div>
          )}
          <form onSubmit={handleAddLocation}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Commune (CRM)</label>
                <select
                  value={selectedCommuneId}
                  onChange={e => { setSelectedCommuneId(e.target.value); if (e.target.value) setCommuneNameFree('') }}
                  className="form-control"
                >
                  <option value="">-- Saisie libre ou choisissez --</option>
                  {communes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.zipCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nom libre (si non CRM)</label>
                <input
                  type="text"
                  value={communeNameFree}
                  onChange={e => { setCommuneNameFree(e.target.value); if (e.target.value) setSelectedCommuneId('') }}
                  disabled={!!selectedCommuneId}
                  className="form-control"
                  placeholder="Ex: Valbonne Sophia Antipolis"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="form-control" placeholder="Place du marché..." />
              </div>
              <div className="form-group">
                <label className="form-label">Heure de début</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">Heure de fin</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="form-control" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="button" style={{ minWidth: '160px' }}>
              <Plus size={16} /> {loading ? 'Ajout...' : 'Ajouter ce lieu'}
            </button>
          </form>
        </div>
      )}

      {/* LOCATIONS LIST */}
      {locations.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <MapPin size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Aucun lieu planifié</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Ajoutez des communes et des lieux de passage pour cette permanence.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {locations.map(loc => {
            const pkColor = PARKING_STATUS_COLORS[loc.parkingStatus] || PARKING_STATUS_COLORS.TODO
            const isExpanded = expandedLocation === loc.id
            const edit = detailEdits[loc.id]

            return (
              <div key={loc.id} className="card" style={{ overflow: 'hidden' }}>
                {/* MAIN ROW */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--foreground)' }}>{loc.communeName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} />
                        {new Date(loc.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </span>
                      {(loc.startTime || loc.endTime) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} />
                          {loc.startTime}{loc.endTime ? ` → ${loc.endTime}` : ''}
                        </span>
                      )}
                      {loc.address && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Building2 size={13} />
                          {loc.address}
                        </span>
                      )}
                    </div>

                    {/* Mairie contact quick view */}
                    {loc.mairieContact && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <User size={13} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>Contact mairie :</span>
                        {loc.mairieContact.firstName} {loc.mairieContact.lastName}
                        {loc.mairieContact.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Phone size={12} /> {loc.mairieContact.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Parking status */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map(s => (
                        <button
                          key={s}
                          disabled={isReadOnly}
                          onClick={() => handleParkingStatus(loc.id, s)}
                          title={`Stationnement : ${PARKING_STATUS_LABELS[s]}`}
                          style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px', border: 'none', cursor: isReadOnly ? 'default' : 'pointer',
                            ...(loc.parkingStatus === s ? pkColor : { bg: '#f3f4f6', background: '#f3f4f6', color: '#9ca3af' })
                          }}
                        >
                          {s === 'TODO' ? '🅿 À confirmer' : s === 'IN_PROGRESS' ? '🅿 En cours' : '🅿 OK'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        initDetailEdit(loc)
                        setExpandedLocation(isExpanded ? null : loc.id)
                      }}
                      className="button outline"
                      style={{ height: '36px', padding: '0 0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <FileText size={14} />
                      Détails
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {!isReadOnly && (
                      <button onClick={() => handleDelete(loc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }} title="Supprimer">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* EXPANDED DETAIL PANEL */}
                {isExpanded && edit && (
                  <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} />
                          Contact mairie (fiche CRM)
                        </label>
                        <select
                          disabled={isReadOnly}
                          value={edit.mairieContactId}
                          onChange={e => setDetailEdits(prev => ({ ...prev, [loc.id]: { ...prev[loc.id], mairieContactId: e.target.value } }))}
                          className="form-control"
                        >
                          <option value="">-- Aucun contact sélectionné --</option>
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.lastName} {c.firstName}{c.city ? ` (${c.city})` : ''}{c.phone ? ` — ${c.phone}` : ''}
                            </option>
                          ))}
                        </select>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Sélectionnez le contact de la mairie depuis vos fiches CRM
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={14} />
                          Notes sur ce lieu
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={edit.locationNotes}
                          onChange={e => setDetailEdits(prev => ({ ...prev, [loc.id]: { ...prev[loc.id], locationNotes: e.target.value } }))}
                          className="form-control"
                          rows={3}
                          placeholder="Accès, remarques particulières, interlocuteurs..."
                        />
                      </div>
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={() => handleSaveDetails(loc.id)}
                        disabled={edit.saving}
                        className="button"
                        style={{ marginTop: '0.75rem' }}
                      >
                        <Check size={16} />
                        {edit.saving ? 'Sauvegarde...' : 'Sauvegarder les détails'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
