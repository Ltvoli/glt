'use client'

import { useState } from 'react'
import DocumentRow from './DocumentRow'
import { Folder, Shield, CheckCircle, Trash2, X, UploadCloud, Loader2 } from 'lucide-react'
import { bulkMoveDocuments, bulkUpdateConfidentiality, bulkUpdateStatus, bulkDeleteDocuments } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DocumentListClientProps {
  docs: any[]
  folders: any[]
  activeFolderId?: string | null
}

export default function DocumentListClient({ docs, folders, activeFolderId }: DocumentListClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const router = useRouter()

  // Selected values for bulk dropdowns
  const [targetFolderId, setTargetFolderId] = useState<string>('')
  const [targetConfidentiality, setTargetConfidentiality] = useState<string>('')
  const [targetStatus, setTargetStatus] = useState<string>('')

  const allSelected = docs.length > 0 && selectedIds.length === docs.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(docs.map(d => d.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBulkMove = async () => {
    if (selectedIds.length === 0) return
    setIsProcessing(true)
    const toastId = toast.loading(`Déplacement de ${selectedIds.length} document(s)...`)
    try {
      await bulkMoveDocuments(selectedIds, targetFolderId || null)
      toast.success("Documents déplacés avec succès !", { id: toastId })
      setSelectedIds([])
      setTargetFolderId('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du déplacement", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkConfidentiality = async () => {
    if (selectedIds.length === 0 || !targetConfidentiality) return
    setIsProcessing(true)
    const toastId = toast.loading("Mise à jour de la confidentialité...")
    try {
      await bulkUpdateConfidentiality(selectedIds, targetConfidentiality)
      toast.success("Confidentialité mise à jour !", { id: toastId })
      setSelectedIds([])
      setTargetConfidentiality('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkStatus = async () => {
    if (selectedIds.length === 0 || !targetStatus) return
    setIsProcessing(true)
    const toastId = toast.loading("Mise à jour du statut...")
    try {
      await bulkUpdateStatus(selectedIds, targetStatus)
      toast.success("Statut mis à jour !", { id: toastId })
      setSelectedIds([])
      setTargetStatus('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Voulez-vous vraiment supprimer les ${selectedIds.length} documents sélectionnés ?`)) return

    setIsProcessing(true)
    const toastId = toast.loading("Suppression en cours...")
    try {
      await bulkDeleteDocuments(selectedIds)
      toast.success(`${selectedIds.length} document(s) supprimé(s) !`, { id: toastId })
      setSelectedIds([])
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression", { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  // Full Area Drag & Drop File Upload
  const handleDragOverArea = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(true)
    }
  }

  const handleDragLeaveArea = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }

  const handleDropArea = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const toastId = toast.loading(`Importation de ${filesArray.length} fichier(s)...`)

    try {
      const uploadPromises = filesArray.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        if (activeFolderId) {
          formData.append('folderId', activeFolderId)
        }
        formData.append('documentType', 'AUTRE')
        formData.append('confidentiality', 'INTERNE')

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Erreur d'importation pour ${file.name}`)
        }
      })

      await Promise.all(uploadPromises)
      toast.success(`${filesArray.length} fichier(s) importé(s) avec succès !`, { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'importation", { id: toastId })
    }
  }

  return (
    <div 
      onDragOver={handleDragOverArea}
      onDragLeave={handleDragLeaveArea}
      onDrop={handleDropArea}
      style={{ position: 'relative', minHeight: '300px' }}
    >
      {/* Visual Overlay when dropping desktop files */}
      {isDraggingFile && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '3px dashed var(--primary)',
          borderRadius: '12px',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          pointerEvents: 'none',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <UploadCloud size={48} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>
            Déposez vos fichiers ici pour les importer automatiquement
          </p>
        </div>
      )}

      {/* Select All & Summary Header */}
      {docs.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0.75rem 1rem', 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px',
          marginBottom: '1rem' 
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
            <input 
              type="checkbox" 
              checked={allSelected} 
              onChange={toggleSelectAll} 
              style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'} ({docs.length})
          </label>
          
          {selectedIds.length > 0 && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
              {selectedIds.length} document(s) sélectionné(s)
            </span>
          )}
        </div>
      )}

      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'sticky',
          top: '1rem',
          zIndex: 30,
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
            <span>{selectedIds.length} sélectionné(s)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Déplacer vers dossier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                disabled={isProcessing}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#334155', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="">Sélectionner un dossier...</option>
                <option value="">(Aucun dossier / Racine)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkMove}
                disabled={isProcessing}
                className="button primary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Folder size={14} /> Déplacer
              </button>
            </div>

            {/* Confidentialité */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={targetConfidentiality}
                onChange={(e) => setTargetConfidentiality(e.target.value)}
                disabled={isProcessing}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#334155', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="">Confidentialité...</option>
                <option value="INTERNE">Interne</option>
                <option value="RESTREINT">Restreint</option>
                <option value="SENSIBLE">Sensible</option>
                <option value="CONFIDENTIEL">Confidentiel</option>
              </select>
              <button
                onClick={handleBulkConfidentiality}
                disabled={isProcessing || !targetConfidentiality}
                className="button outline"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: '#334155', borderColor: '#475569', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Shield size={14} /> Appliquer
              </button>
            </div>

            {/* Statut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                disabled={isProcessing}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#334155', color: 'white', fontSize: '0.85rem' }}
              >
                <option value="">Statut...</option>
                <option value="VALIDATED">Validé</option>
                <option value="PENDING">En attente (A valider)</option>
                <option value="DRAFT">Brouillon</option>
              </select>
              <button
                onClick={handleBulkStatus}
                disabled={isProcessing || !targetStatus}
                className="button outline"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: '#334155', borderColor: '#475569', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <CheckCircle size={14} /> Valider
              </button>
            </div>

            {/* Supprimer */}
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600
              }}
            >
              <Trash2 size={14} /> Supprimer
            </button>

            {/* Annuler */}
            <button
              onClick={() => setSelectedIds([])}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
              title="Désélectionner tout"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {docs.length === 0 && (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
            <UploadCloud size={40} style={{ margin: '0 auto 1rem auto', color: '#94a3b8' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#334155' }}>Aucun document trouvé.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Glissez et déposez directement vos fichiers ici pour les importer.</p>
          </div>
        )}
        {docs.map(doc => (
          <DocumentRow 
            key={doc.id} 
            doc={doc} 
            folders={folders} 
            isSelected={selectedIds.includes(doc.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  )
}
