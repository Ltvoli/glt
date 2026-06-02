'use client'

import { useState } from 'react'
import { UploadCloud } from 'lucide-react'

export default function AttachmentUploader({ entityType, entityId }: { entityType: string, entityId: string }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityType', entityType)
    formData.append('entityId', entityId)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }
      
      // Reload page to show the new attachment
      window.location.reload()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur lors du téléversement')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center' }}>
      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        <UploadCloud size={24} color="var(--primary)" />
        <span style={{ fontWeight: 500 }}>{uploading ? 'Upload en cours...' : 'Ajouter une pièce jointe'}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 10Mo. Pas d&apos;exécutables.</span>
      </label>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
