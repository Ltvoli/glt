'use client'

import { useState } from 'react'
import { FileText, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DocumentCreateModal({ folders = [] }: { folders?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const documentType = formData.get('documentType') as string
    const confidentiality = formData.get('confidentiality') as string
    const folderId = formData.get('folderId') as string

    try {
      const res = await fetch('/api/documents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          documentType,
          confidentiality,
          folderId
        })
      })

      const data = await res.json()

      if (res.ok) {
        setIsOpen(false)
        router.refresh()
      } else {
        setError(data.error || "Erreur lors de la création")
      }
    } catch (err) {
      setError("Erreur réseau")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center', 
          backgroundColor: 'white', 
          color: 'var(--text)', 
          padding: '0.5rem 1rem', 
          borderRadius: '4px', 
          border: '1px solid var(--border)', 
          cursor: 'pointer',
          fontWeight: 500
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        <FileText size={20} style={{ color: 'var(--primary)' }} />
        Rédiger un document
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px', 
            width: '100%', maxWidth: '650px', position: 'relative'
          }}>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="var(--text-muted)" />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Rédiger un nouveau document</h2>
            
            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Titre *</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder="Titre de la note ou du document" 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Contenu *</label>
                <textarea 
                  name="content" 
                  required 
                  placeholder="Saisissez ou collez le texte du document ici..." 
                  rows={10} 
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                  <select name="documentType" defaultValue="NOTE" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
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
                  <select name="confidentiality" defaultValue="INTERNE" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <option value="INTERNE">Interne</option>
                    <option value="RESTREINT">Restreint</option>
                    <option value="SENSIBLE">Sensible</option>
                    <option value="CONFIDENTIEL">Confidentiel</option>
                  </select>
                </div>
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
                <button type="submit" disabled={isSaving} className="button primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
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
