'use client'

import { useState } from 'react'
import { Upload, Download, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PlanningImportModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUploading(true)
    setError('')
    setSuccessMsg('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/planning/import', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setSuccessMsg(data.message)
        setTimeout(() => {
          setIsOpen(false)
          setSuccessMsg('')
          router.refresh()
        }, 2000)
      } else {
        setError(data.error || "Erreur lors de l'importation")
      }
    } catch (err) {
      setError("Erreur réseau")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="button outline"
        title="Importer depuis Excel"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Upload size={18} />
        <span className="hidden sm:inline">Importer</span>
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
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Import Excel</h2>
            
            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '4px', marginBottom: '1rem' }}>
                {successMsg}
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-muted)', borderRadius: '4px' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>1. Modèle d'import</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Téléchargez le modèle vierge contenant les bonnes colonnes (Email, Date, Statut, Notes) et remplissez-le.
              </p>
              <a 
                href="/api/planning/template" 
                download
                className="button outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                <Download size={16} />
                Télécharger le modèle
              </a>
            </div>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>2. Uploader le fichier rempli</h3>
                <input 
                  type="file" 
                  name="file" 
                  accept=".xls,.xlsx" 
                  required 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="button outline">
                  Annuler
                </button>
                <button type="submit" disabled={isUploading || !!successMsg} className="button primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Valider l'import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
