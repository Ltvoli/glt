'use client'

import { useState } from 'react'
import { Folder, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteFolder } from './folder-actions'

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
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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

  return (
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
      <div style={{ flex: 1, minWidth: 0, paddingRight: isHovered ? '24px' : '0px', transition: 'padding 0.2s' }}>
        <h4 style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#1e293b' }}>
          {folder.name}
        </h4>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
          {count} document{count > 1 ? 's' : ''}
        </p>
      </div>

      {isHovered && (
        <button
          onClick={(e) => onDelete(e, folder.id, folder.name)}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
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
          <Trash2 size={16} />
        </button>
      )}
    </Link>
  )
}
