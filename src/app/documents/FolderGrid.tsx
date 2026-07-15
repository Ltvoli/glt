'use client'

import { useState } from 'react'
import { Folder, Loader2, Trash2, Edit2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteFolder, moveDocumentToFolder, updateFolder } from './folder-actions'

const PALETTE_COLORS = [
  { name: 'Ardoise', hex: '#64748b' },
  { name: 'Rouge', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Ambre', hex: '#f59e0b' },
  { name: 'Vert', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Bleu', hex: '#2563eb' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#ec4899' },
]

interface FolderType {
  id: string
  name: string
  color: string
}

interface FolderGridProps {
  folders: FolderType[]
  counts: Record<string, number>
  searchParams: any
}

export default function FolderGrid({ folders, counts, searchParams }: FolderGridProps) {
  const router = useRouter()

  const getFolderLink = (folderId: string) => {
    const params = new URLSearchParams()
    if (searchParams.q) params.set('q', searchParams.q)
    params.set('folder', folderId)
    if (searchParams.conf) params.set('conf', searchParams.conf)
    if (searchParams.author) params.set('author', searchParams.author)
    if (searchParams.relation) params.set('relation', searchParams.relation)
    if (searchParams.status) params.set('status', searchParams.status)
    return `/documents?${params.toString()}`
  }

  const handleDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Check if it's an internal document drag
    const docId = e.dataTransfer.getData('text/plain')
    if (docId) {
      const toastId = toast.loading("Déplacement du document...")
      try {
        await moveDocumentToFolder(docId, folderId)
        toast.success("Document déplacé avec succès !", { id: toastId })
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || "Erreur lors du déplacement", { id: toastId })
      }
      return
    }

    // 2. Check if it's external files drag
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const toastId = toast.loading(`Importation de ${filesArray.length} fichier(s)...`)

    try {
      const uploadPromises = filesArray.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('folderId', folderId)
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
      toast.success("Fichier(s) importé(s) avec succès !", { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'importation", { id: toastId })
    }
  }

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(`Voulez-vous vraiment supprimer le dossier "${folderName}" ? Les documents contenus seront conservés en dehors du dossier.`)) {
      return
    }

    try {
      await deleteFolder(folderId)
      toast.success(`Le dossier "${folderName}" a été supprimé.`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression.")
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
      {folders.map(folder => {
        const count = counts[folder.id] || 0
        return (
          <FolderCard 
            key={folder.id} 
            folder={folder} 
            count={count} 
            link={getFolderLink(folder.id)} 
            onDrop={handleDrop}
            onDelete={handleDeleteFolder}
          />
        )
      })}
    </div>
  )
}

function FolderCard({ folder, count, link, onDrop, onDelete }: {
  folder: FolderType
  count: number
  link: string
  onDrop: (e: React.DragEvent, folderId: string) => void
  onDelete: (e: React.MouseEvent, folderId: string, folderName: string) => void
}) {
  const router = useRouter()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Edit folder states
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [editColor, setEditColor] = useState(folder.color)
  const [editError, setEditError] = useState('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDropLocal = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDrop(e, folder.id)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingEdit(true)
    setEditError('')

    try {
      await updateFolder(folder.id, editName, editColor)
      setIsEditing(false)
      toast.success("Dossier mis à jour avec succès !")
      router.refresh()
    } catch (err: any) {
      setEditError(err.message || "Erreur lors de la modification du dossier")
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <>
      <Link
        href={link}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropLocal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          backgroundColor: isDragOver ? `${folder.color}08` : 'white',
          border: isDragOver 
            ? `2px dashed ${folder.color}` 
            : '1px solid #e2e8f0',
          borderRadius: '12px',
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          position: 'relative',
          transform: isDragOver ? 'scale(1.02)' : 'none',
          boxShadow: isDragOver ? `0 10px 15px -3px ${folder.color}20` : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '3rem',
          height: '3rem',
          borderRadius: '10px',
          backgroundColor: `${folder.color}15`,
          color: folder.color,
          transition: 'transform 0.2s',
          transform: isHovered ? 'scale(1.05)' : 'none'
        }}>
          <Folder size={28} style={{ fill: `${folder.color}20` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: isHovered ? '50px' : '0px', transition: 'padding 0.2s' }}>
          <h4 style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#1e293b' }}>
            {folder.name}
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
            {count} document{count > 1 ? 's' : ''}
          </p>
        </div>

        {isHovered && (
          <div 
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '0.35rem',
              backgroundColor: 'white',
              padding: '4px',
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsEditing(true)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e0f2fe'
              }}
              title="Modifier le dossier"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => onDelete(e, folder.id, folder.name)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fee2e2'
              }}
              title="Supprimer le dossier"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </Link>

      {isEditing && (
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'default'
          }}
        >
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px', 
            width: '100%', maxWidth: '450px', position: 'relative',
            textAlign: 'left'
          }}>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(false); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="var(--text-muted)" />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Modifier le dossier</h2>
            
            {editError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem' }}>
                {editError}
              </div>
            )}
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Nom du dossier *</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>Couleur</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {PALETTE_COLORS.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setEditColor(color.hex)}
                      style={{
                        backgroundColor: color.hex,
                        height: '2.5rem',
                        borderRadius: '6px',
                        border: editColor === color.hex ? '3px solid #000' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        transform: editColor === color.hex ? 'scale(1.05)' : 'none'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(false); }} 
                  className="button outline"
                >
                  Annuler
                </button>
                <button type="submit" disabled={isSavingEdit} className="button primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Folder size={16} />}
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
