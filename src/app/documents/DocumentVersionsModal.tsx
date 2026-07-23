'use client'

import { useState, useEffect } from 'react'
import { History, X, UploadCloud, RotateCcw, Loader2, FileText, CheckCircle2 } from 'lucide-react'
import { getDocumentVersions, restoreDocumentVersion } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DocumentVersionsModalProps {
  doc: any
  isOpen: boolean
  onClose: () => void
}

export default function DocumentVersionsModal({ doc, isOpen, onClose }: DocumentVersionsModalProps) {
  const [versions, setVersions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const loadVersions = async () => {
    if (!doc?.id) return
    setIsLoading(true)
    try {
      const data = await getDocumentVersions(doc.id)
      setVersions(data)
    } catch (err: any) {
      toast.error("Erreur lors du chargement des versions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && doc?.id) {
      loadVersions()
    }
  }, [isOpen, doc])

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Voulez-vous vraiment restaurer la version V${versionNumber} ?`)) return
    setIsRestoring(versionId)
    const toastId = toast.loading(`Restauration de la V${versionNumber}...`)
    try {
      await restoreDocumentVersion(doc.id, versionId)
      toast.success(`Version V${versionNumber} restaurée avec succès !`, { id: toastId })
      await loadVersions()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la restauration", { id: toastId })
    } finally {
      setIsRestoring(null)
    }
  }

  const handleUploadNewVersion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUploading(true)
    const toastId = toast.loading("Téléversement de la nouvelle version...")

    const formData = new FormData(e.currentTarget)
    formData.append('documentId', doc.id)
    formData.append('folderId', doc.folderId || '')

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error("Erreur de téléversement")

      toast.success("Nouvelle version ajoutée !", { id: toastId })
      await loadVersions()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur de téléversement", { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen || !doc) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f3e8ff', borderRadius: '8px', color: '#9333ea' }}>
              <History size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Historique des Versions</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {doc.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Upload form for next version */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#7e22ce', margin: '0 0 0.5rem 0' }}>
            ➕ Téléverser une nouvelle version du fichier
          </p>
          <form onSubmit={handleUploadNewVersion} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input 
              type="file" 
              name="file" 
              required 
              style={{ flex: 1, padding: '0.4rem', border: '1px solid #d8b4fe', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.85rem' }} 
            />
            <button 
              type="submit" 
              disabled={isUploading}
              className="button primary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#9333ea', borderColor: '#9333ea' }}
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Ajouter V+1
            </button>
          </form>
        </div>

        {/* List of versions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
              Chargement de l'historique...
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {/* Version actuelle */}
              <div style={{
                padding: '1rem', border: '2px solid #2563eb', borderRadius: '10px',
                backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', borderRadius: '6px', fontSize: '0.8rem' }}>
                    Actuelle
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1e3a8a' }}>
                      {doc.originalName}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>
                      {(doc.size / 1024).toFixed(1)} KB • Par {doc.uploadedBy?.name || 'Inconnu'}
                    </p>
                  </div>
                </div>
                <CheckCircle2 size={20} color="#2563eb" />
              </div>

              {/* Anciennes versions */}
              {versions.map(v => (
                <div 
                  key={v.id}
                  style={{
                    padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px',
                    backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', borderRadius: '6px', fontSize: '0.8rem' }}>
                      V{v.versionNumber}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                        {v.originalName}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        {(v.size / 1024).toFixed(1)} KB • Par {v.uploadedByName} le {new Date(v.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      {v.notes && <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#8b5cf6', fontStyle: 'italic' }}>{v.notes}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(v.id, v.versionNumber)}
                    disabled={isRestoring === v.id}
                    className="button outline"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    {isRestoring === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Restaurer
                  </button>
                </div>
              ))}

              {versions.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', padding: '1rem' }}>
                  Aucune ancienne version archivée pour le moment.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
