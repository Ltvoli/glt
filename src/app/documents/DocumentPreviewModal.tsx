'use client'

import { useState, useEffect } from 'react'
import { Eye, X, Download, FileText, CheckCircle, Shield } from 'lucide-react'
import { logDocumentAccess } from './actions'

interface DocumentPreviewModalProps {
  doc: any
  isOpen: boolean
  onClose: () => void
}

export default function DocumentPreviewModal({ doc, isOpen, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    if (isOpen && doc?.id) {
      logDocumentAccess(doc.id, 'VIEW', 'Consultation via le prévisualiseur').catch(() => {})
    }
  }, [isOpen, doc])

  if (!isOpen || !doc) return null

  const isPdf = doc.mimeType === 'application/pdf' || doc.extension?.toLowerCase() === '.pdf'
  const isImage = doc.mimeType?.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => doc.extension?.toLowerCase() === ext)
  const isHtmlOrText = doc.mimeType === 'text/html' || doc.mimeType === 'text/plain' || doc.extension === '.html' || doc.extension === '.md'
  const downloadUrl = `/api/documents/${doc.id}/download`

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: '8px', color: 'var(--primary)' }}>
              <Eye size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>{doc.title}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {doc.originalName} • {(doc.size / 1024).toFixed(1)} KB • {doc.confidentiality}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="button primary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} /> Télécharger
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#f1f5f9', minHeight: '400px' }}>
          {isPdf ? (
            <iframe 
              src={downloadUrl} 
              style={{ width: '100%', height: '550px', border: 'none', borderRadius: '8px', backgroundColor: 'white' }}
              title={doc.title}
            />
          ) : isImage ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
              <img 
                src={downloadUrl} 
                alt={doc.title} 
                style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
            </div>
          ) : isHtmlOrText && doc.extractedText ? (
            <div 
              style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '350px', fontSize: '0.95rem', lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ __html: doc.extractedText }}
            />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <FileText size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Aperçu direct non disponible pour ce format ({doc.extension})</h4>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Vous pouvez télécharger le fichier pour le consulter sur votre logiciel habituel.
              </p>
              
              {doc.extractedText && (
                <div style={{ textAlign: 'left', marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569', margin: '0 0 0.5rem 0' }}>Texte extrait du document :</p>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#334155', margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    {doc.extractedText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
          <div>
            Ajouté par <strong>{doc.uploadedBy?.name || 'Inconnu'}</strong> le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
          </div>
          {doc.isSigned && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: 600 }}>
              <CheckCircle size={16} /> Signé électroniquement le {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
