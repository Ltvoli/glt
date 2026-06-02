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
      const res = await fetch('/api/upload', {
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
                <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {att.filename}
                </span>
              </div>
              <a 
                href={`/api/download/${att.id}`} 
                className="button outline" 
                style={{ padding: '0.25rem 0.5rem' }}
                title="Télécharger"
              >
                <Download size={14} />
              </a>
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
