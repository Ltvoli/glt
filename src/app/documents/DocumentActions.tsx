'use client'

import { useState } from 'react'
import { MoreVertical, Trash, Edit2, Loader2, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteDocument, updateDocument } from './actions'

export default function DocumentActions({ document, folders = [] }: { document: any, folders?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [confidentiality, setConfidentiality] = useState(document.confidentiality)
  const [documentType, setDocumentType] = useState(document.documentType)
  const [status, setStatus] = useState(document.status || 'VALIDATED')
  const [folderId, setFolderId] = useState<string | null>(document.folderId || null)
  
  const router = useRouter()

  const handleArchive = async () => {
    if (!confirm("Voulez-vous vraiment archiver ce document ?")) return
    setIsDeleting(true)
    try {
      await deleteDocument(document.id)
      setIsOpen(false)
    } catch (e) {
      alert("Erreur lors de l'archivage")
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateDocument(document.id, { title, confidentiality, documentType, status, folderId })
      setIsEditing(false)
      setIsOpen(false)
      router.refresh()
    } catch (e) {
      alert("Erreur lors de la modification")
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', color: 'var(--text-muted)' }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          minWidth: '200px', zIndex: 10
        }}>
          {!isEditing ? (
            <div style={{ padding: '0.5rem' }}>
              <a 
                href={`/api/documents/${document.id}/download`} 
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', width: '100%', textDecoration: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Download size={16} /> Télécharger
              </a>
              <button 
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Edit2 size={16} /> Gérer & Valider
              </button>
              <button 
                onClick={handleArchive}
                disabled={isDeleting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                Archiver
              </button>
            </div>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '250px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Titre</label>
                <input 
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Statut de validation</label>
                <select 
                  value={status} onChange={e => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.875rem', backgroundColor: status === 'VALIDATED' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#fef9c3' }}
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PENDING">En attente</option>
                  <option value="VALIDATED">Validé</option>
                  <option value="REJECTED">Rejeté</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Confidentialité</label>
                <select 
                  value={confidentiality} onChange={e => setConfidentiality(e.target.value)}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.875rem' }}
                >
                  <option value="INTERNE">Interne</option>
                  <option value="RESTREINT">Restreint</option>
                  <option value="SENSIBLE">Sensible</option>
                  <option value="CONFIDENTIEL">Confidentiel</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Type</label>
                <select 
                  value={documentType} onChange={e => setDocumentType(e.target.value)}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.875rem' }}
                >
                  <option value="NOTE">Note interne</option>
                  <option value="COURRIER">Courrier</option>
                  <option value="QE">Question Écrite</option>
                  <option value="PDF">PDF</option>
                  <option value="WORD">Word</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Dossier</label>
                <select 
                  value={folderId || ''} onChange={e => setFolderId(e.target.value || null)}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.875rem' }}
                >
                  <option value="">(Aucun dossier)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => setIsEditing(false)} style={{ padding: '0.25rem 0.5rem', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Annuler</button>
                <button onClick={handleSave} style={{ padding: '0.25rem 0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Enregistrer</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
