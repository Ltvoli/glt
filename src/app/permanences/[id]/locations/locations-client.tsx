'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLocation, deleteLocation, updateParkingStatus } from '../../actions'
import { Trash2, Plus, MapPin, Calendar, Clock, Check } from 'lucide-react'

type LocationData = {
  id: string
  communeId: string | null
  communeName: string
  date: Date
  startTime: string | null
  endTime: string | null
  address: string | null
  parkingStatus: string
}

type CommuneData = {
  id: string
  name: string
  zipCode: string
}

type LocationsClientProps = {
  permanenceId: string
  locations: LocationData[]
  communes: CommuneData[]
  isReadOnly: boolean
}

export default function LocationsClient({
  permanenceId,
  locations,
  communes,
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

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!selectedCommuneId && !communeNameFree.trim()) return
    if (!dateStr) return

    setLoading(true)
    setError(null)

    // Find commune name if selected
    let name = communeNameFree
    if (selectedCommuneId && selectedCommuneId !== 'FREE') {
      const c = communes.find(c => c.id === selectedCommuneId)
      if (c) name = c.name
    }

    const res = await addLocation(permanenceId, {
      communeId: selectedCommuneId && selectedCommuneId !== 'FREE' ? selectedCommuneId : undefined,
      communeName: name,
      date: new Date(dateStr),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      address: address || undefined
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

  const handleDelete = async (locId: string) => {
    if (isReadOnly) return
    if (!confirm('Voulez-vous supprimer ce lieu ?')) return
    const res = await deleteLocation(permanenceId, locId)
    if (!res.success) {
      setError(res.error || 'Erreur de suppression.')
    } else {
      router.refresh()
    }
  }

  const handleParkingChange = async (locId: string, status: string) => {
    if (isReadOnly) return
    const res = await updateParkingStatus(permanenceId, locId, status as any)
    if (!res.success) {
      setError(res.error || 'Erreur de mise à jour.')
    } else {
      router.refresh()
    }
  }

  return (
    <div>
      {error && (
        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* LOCATIONS LIST */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Commune</th>
              <th>Adresse</th>
              <th>Date & Horaires</th>
              <th style={{ width: '180px' }}>Logistique Parking</th>
              {!isReadOnly && <th style={{ width: '60px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucun arrêt ou lieu planifié.
                </td>
              </tr>
            ) : (
              locations.map(loc => (
                <tr key={loc.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={16} className="text-gray-400" />
                      {loc.communeName}
                    </div>
                  </td>
                  <td>{loc.address || <span className="italic text-gray-400">Non précisée</span>}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)' }}>
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(loc.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                      {(loc.startTime || loc.endTime) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} className="text-gray-400" />
                          {loc.startTime || '??'} - {loc.endTime || '??'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      value={loc.parkingStatus}
                      disabled={isReadOnly}
                      onChange={(e) => handleParkingChange(loc.id, e.target.value)}
                      className="form-control"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                    >
                      <option value="TODO">À réserver</option>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="DONE">Réservé</option>
                      <option value="IMPOSSIBLE">Impossible</option>
                    </select>
                  </td>
                  {!isReadOnly && (
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDelete(loc.id)}
                        className="text-red-500 hover:text-red-700"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD LOCATION FORM */}
      {!isReadOnly && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Planifier un nouvel arrêt / lieu</h4>
          <form onSubmit={handleAddLocation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Commune CRM</label>
              <select
                value={selectedCommuneId}
                onChange={(e) => setSelectedCommuneId(e.target.value)}
                className="form-control"
              >
                <option value="">-- Sélectionner --</option>
                {communes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.zipCode})</option>
                ))}
                <option value="FREE">-- Autre (Saisie libre) --</option>
              </select>
            </div>
            
            {(!selectedCommuneId || selectedCommuneId === 'FREE') && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500">Nom de la commune libre</label>
                <input
                  type="text"
                  value={communeNameFree}
                  onChange={(e) => setCommuneNameFree(e.target.value)}
                  placeholder="Saisissez la commune..."
                  required={selectedCommuneId === 'FREE'}
                  className="form-control"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Adresse de rendez-vous</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Place du marché..."
                className="form-control"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Heure de début</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-control"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Heure de fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-control"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button"
              style={{ gridColumn: 'span 1' }}
            >
              <Plus size={14} /> Ajouter le lieu
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
