'use client'

import { useState } from 'react'
import { Paperclip, Download, Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function QEAttachments({ qeId, initialAttachments }: { qeId: string, initialAttachments: any[] }) {
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityType', 'qe') // Link to QE
    formData.append('entityId', qeId)

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        router.refresh()
      } else {
        alert("Erreur lors de l'upload")
      }
    } catch (err) {
      alert("Erreur réseau")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {initialAttachments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune pièce jointe.</p>
        ) : (
          initialAttachments.map(att => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <Paperclip size={16} color="var(--text-muted)" />
                <div>
                  <a 
                    href={`/api/documents/${att.id}/download`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Download size={14} /> {att.originalName}
                  </a>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    {(att.size / 1024).toFixed(1)} KB • {new Date(att.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <label className="button outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {isUploading ? 'Upload en cours...' : 'Ajouter un fichier'}
          <input 
            type="file" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  )
}
