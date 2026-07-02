'use client'

import { useState } from 'react'
import { UploadCloud, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DocumentUploadModal({ folders = [] }: { folders?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUploading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      let data: any = {}
      try {
        data = await res.json()
      } catch {
        // Response n'est pas du JSON (ex: 500 HTML)
        data = { error: `Erreur serveur ${res.status}` }
      }
      
      if (res.ok) {
        setIsOpen(false)
        router.refresh()
      } else {
        setError(data.error || `Erreur ${res.status} lors de l'upload`)
      }
    } catch (err: any) {
      setError(`Erreur réseau : ${err?.message || 'impossible de joindre le serveur'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
      >
        <UploadCloud size={20} />
        Uploader un document
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px', 
            width: '100%', maxWidth: '500px', position: 'relative'
          }}>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="var(--text-muted)" />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Nouveau document</h2>
            
            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Fichier *</label>
                <input type="file" name="file" required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Titre *</label>
                <input type="text" name="title" required placeholder="Titre du document" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select name="documentType" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <option value="NOTE">Note interne</option>
                    <option value="COURRIER">Courrier</option>
                    <option value="QE">Question Écrite</option>
                    <option value="PDF">PDF</option>
                    <option value="WORD">Word</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Confidentialité</label>
                  <select name="confidentiality" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <option value="INTERNE">Interne</option>
                    <option value="RESTREINT">Restreint</option>
                    <option value="SENSIBLE">Sensible</option>
                    <option value="CONFIDENTIEL">Confidentiel</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Statut de validation</label>
                <select name="status" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <option value="VALIDATED">Directement validé (Défaut)</option>
                  <option value="PENDING">Soumettre pour validation (En attente)</option>
                  <option value="DRAFT">Brouillon</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Dossier</label>
                <select name="folderId" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <option value="">(Aucun dossier)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="button outline">
                  Annuler
                </button>
                <button type="submit" disabled={isUploading} className="button primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
