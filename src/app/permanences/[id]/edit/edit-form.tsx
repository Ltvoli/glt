'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePermanence, deletePermanence } from '../../actions'
import { renderPermanenceField } from '../../dynamic-permanence-fields'

type PermData = {
  id: string
  title: string
  scheduledStartDate: Date
  notes: string | null
  status: any
  ownerUserId: string | null
  deputyRemarks: string | null
}

export default function EditForm({ permanence, users = [], fieldConfig = {} }: { permanence: PermData, users?: any[], fieldConfig?: Record<string, any> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const titleVal = formData.get('title') as string
    const dateStrVal = formData.get('scheduledStartDate') as string
    const notesVal = formData.get('notes') as string
    const statusVal = formData.get('status') as string
    const ownerUserIdVal = formData.get('ownerUserId') as string
    const deputyRemarksVal = formData.get('deputyRemarks') as string

    if (!titleVal || !dateStrVal) {
      setError('Le titre et la date sont requis.')
      setLoading(false)
      return
    }

    const res = await updatePermanence(permanence.id, {
      title: titleVal,
      scheduledStartDate: new Date(dateStrVal),
      notes: notesVal || undefined,
      status: statusVal || undefined,
      ownerUserId: ownerUserIdVal || undefined,
      deputyRemarks: deputyRemarksVal || undefined
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

  const generalFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Général' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {generalFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {generalFields.map((f: any) => renderPermanenceField(f.key, f.label, permanence, users))}
        </div>
      )}

      {/* Hidden fallbacks for required fields if they are not visible in config */}
      {!fieldConfig?.title?.isVisible && (
        <input type="hidden" name="title" value={permanence.title} />
      )}
      {!fieldConfig?.scheduledStartDate?.isVisible && (
        <input type="hidden" name="scheduledStartDate" value={new Date(permanence.scheduledStartDate).toISOString().split('T')[0]} />
      )}

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
