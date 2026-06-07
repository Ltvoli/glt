'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePermanence, deletePermanence } from '../../actions'

type PermData = {
  id: string
  title: string
  scheduledStartDate: Date
  notes: string | null
}

export default function EditForm({ permanence }: { permanence: PermData }) {
  const router = useRouter()
  const [title, setTitle] = useState(permanence.title)
  const [dateStr, setDateStr] = useState(new Date(permanence.scheduledStartDate).toISOString().split('T')[0])
  const [notes, setNotes] = useState(permanence.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await updatePermanence(permanence.id, {
      title,
      scheduledStartDate: new Date(dateStr),
      notes: notes || undefined
    })
    if (!res.success) {
      setError(res.error || 'Erreur lors de la modification.')
    } else {
      router.push(`/permanences/${permanence.id}`)
      router.refresh()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment archiver (soft-delete) cette permanence ?')) return
    setLoading(true)
    setError(null)
    const res = await deletePermanence(permanence.id)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la suppression.')
      setLoading(false)
    } else {
      router.push('/permanences')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Titre de la permanence</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required 
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Date de la permanence</label>
        <input 
          type="date" 
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          required 
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Notes ou instructions complémentaires</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4} 
          className="form-control"
          style={{ resize: 'vertical' }}
        ></textarea>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          onClick={handleDelete}
          disabled={loading}
          className="button danger outline"
          style={{ flex: 1 }}
        >
          Archiver (Supprimer)
        </button>
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="button outline"
          style={{ flex: 1 }}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="button"
          style={{ flex: 2 }}
        >
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}
