'use client'

import { FileText, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import DocumentActions from './DocumentActions'

interface DocumentType {
  id: string
  title: string
  documentType: string
  size: number
  uploadedBy: { name: string }
  status: string
  confidentiality: string
  tags: string | null
  contact?: { id: string; firstName: string; lastName: string } | null
  task?: { id: string; title: string } | null
  mailCase?: { id: string; reference: string } | null
  question?: { id: string; title: string; anNumber: string | null } | null
}

export default function DocumentRow({ doc, folders = [] }: { doc: DocumentType, folders: any[] }) {
  const docTags: string[] = (() => {
    try {
      if (doc.tags) {
        const parsed = JSON.parse(doc.tags)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return typeof doc.tags === 'string' && doc.tags ? [doc.tags] : []
  })()

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', doc.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1rem', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        backgroundColor: 'white',
        cursor: 'grab',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onDragEnd={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a 
          href={`/api/documents/${doc.id}/download`} 
          target="_blank" 
          rel="noreferrer"
          title="Ouvrir le document"
          className="document-icon-link"
          style={{ cursor: 'pointer' }}
        >
          <FileText size={32} />
        </a>
        <div>
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: 0 }}>
            <a 
              href={`/api/documents/${doc.id}/download`} 
              target="_blank" 
              rel="noreferrer"
              title="Ouvrir le document"
              className="document-title-link"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {doc.title}
            </a>
            
            {doc.status === 'PENDING' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '0.7rem', borderRadius: '4px' }}>À valider</span>}
            {doc.status === 'REJECTED' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fecaca', color: '#991b1b', fontSize: '0.7rem', borderRadius: '4px' }}>Rejeté</span>}
            {doc.status === 'DRAFT' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.7rem', borderRadius: '4px' }}>Brouillon</span>}

            {doc.confidentiality === 'SENSIBLE' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '0.7rem', borderRadius: '4px' }}>Sensible</span>}
            {doc.confidentiality === 'RESTREINT' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.7rem', borderRadius: '4px' }}>Restreint</span>}
            {doc.confidentiality === 'CONFIDENTIEL' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fecaca', color: '#991b1b', fontSize: '0.7rem', borderRadius: '4px' }}>Confidentiel</span>}

            {docTags.map(tag => (
              <span key={tag} style={{ padding: '0.1rem 0.4rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '4px 0 0 0' }}>
            {doc.documentType} • {(doc.size / 1024).toFixed(1)} KB • Par {doc.uploadedBy.name}
            
            {doc.contact && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                <LinkIcon size={12} /> <Link href={`/contacts/${doc.contact.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{doc.contact.firstName} {doc.contact.lastName}</Link>
              </span>
            )}
            {doc.task && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                <LinkIcon size={12} /> <Link href={`/tasks/${doc.task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>Tâche: {doc.task.title}</Link>
              </span>
            )}
            {doc.mailCase && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                <LinkIcon size={12} /> <Link href={`/mails/${doc.mailCase.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>Courrier: {doc.mailCase.reference}</Link>
              </span>
            )}
            {doc.question && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                <LinkIcon size={12} /> <Link href={`/qe/${doc.question.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>QE: {doc.question.anNumber || doc.question.title}</Link>
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <DocumentActions document={JSON.parse(JSON.stringify(doc))} folders={folders} />
      </div>
    </div>
  )
}
