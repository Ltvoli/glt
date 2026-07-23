'use client'

import { FileText, FileSpreadsheet, Link as LinkIcon, Eye, History, ShieldCheck, FileSignature, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import DocumentActions from './DocumentActions'
import DocumentPreviewModal from './DocumentPreviewModal'
import DocumentVersionsModal from './DocumentVersionsModal'
import DocumentAuditLogModal from './DocumentAuditLogModal'
import DocumentSignatureModal from './DocumentSignatureModal'

interface DocumentType {
  id: string
  title: string
  documentType: string
  size: number
  uploadedBy: { name: string }
  status: string
  confidentiality: string
  tags: string | null
  originalName?: string | null
  mimeType?: string
  extension?: string
  extractedText?: string | null
  isSigned?: boolean
  signedAt?: string | Date | null
  signedBy?: { name: string } | null
  contact?: { id: string; firstName: string; lastName: string } | null
  task?: { id: string; title: string } | null
  mailCase?: { id: string; reference: string } | null
  question?: { id: string; title: string; anNumber: string | null } | null
}

function DocumentRowActions({ doc, folders }: { doc: any, folders: any[] }) {
  const [showPreview, setShowPreview] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [showSignature, setShowSignature] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer',
          padding: '0.35rem 0.5rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.8rem', backgroundColor: '#f0f9ff'
        }}
        title="Aperçu rapide"
      >
        <Eye size={14} /> Aperçu
      </button>

      <button
        onClick={() => setShowVersions(true)}
        style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer',
          padding: '0.35rem 0.5rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.8rem', backgroundColor: '#f5f3ff'
        }}
        title="Historique des versions"
      >
        <History size={14} /> Versions
      </button>

      <button
        onClick={() => setShowAudit(true)}
        style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer',
          padding: '0.35rem 0.5rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.8rem', backgroundColor: '#f0fdf4'
        }}
        title="Journal d'audit & traçabilité"
      >
        <ShieldCheck size={14} /> Audit
      </button>

      {!doc.isSigned && (
        <button
          onClick={() => setShowSignature(true)}
          style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer',
            padding: '0.35rem 0.5rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.8rem', backgroundColor: '#fffbeb'
          }}
          title="Signer électroniquement"
        >
          <FileSignature size={14} /> Signer
        </button>
      )}

      <DocumentActions document={JSON.parse(JSON.stringify(doc))} folders={folders} />

      <DocumentPreviewModal doc={doc} isOpen={showPreview} onClose={() => setShowPreview(false)} />
      <DocumentVersionsModal doc={doc} isOpen={showVersions} onClose={() => setShowVersions(false)} />
      <DocumentAuditLogModal doc={doc} isOpen={showAudit} onClose={() => setShowAudit(false)} />
      <DocumentSignatureModal doc={doc} isOpen={showSignature} onClose={() => setShowSignature(false)} />
    </>
  )
}

export default function DocumentRow({ 
  doc, 
  folders = [],
  isSelected = false,
  onToggleSelect
}: { 
  doc: DocumentType
  folders?: any[]
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const isExcel = doc.documentType === 'EXCEL' || 
    (doc.originalName && (doc.originalName.endsWith('.xlsx') || doc.originalName.endsWith('.xls') || doc.originalName.endsWith('.csv')))

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
        border: isSelected ? '1px solid var(--primary)' : '1px solid #e2e8f0', 
        borderRadius: '8px', 
        backgroundColor: isSelected ? '#f0f9ff' : 'white',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
      }}
      onDragEnd={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onToggleSelect && (
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(doc.id)}
            style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <a 
          href={`/api/documents/${doc.id}/download`} 
          target="_blank" 
          rel="noreferrer"
          title="Ouvrir le document"
          className="document-icon-link"
          style={{ cursor: 'pointer', color: isExcel ? '#16a34a' : 'inherit' }}
        >
          {isExcel ? <FileSpreadsheet size={32} color="#16a34a" /> : <FileText size={32} />}
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

            {doc.isSigned && (
              <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <CheckCircle size={10} /> Signé
              </span>
            )}

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
      
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <DocumentRowActions doc={doc} folders={folders} />
      </div>
    </div>
  )
}
