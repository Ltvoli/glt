'use client'

import { Lock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import { MAIL_VARIABLES_CATALOG, MailVariableContext, resolveVariables } from '@/lib/mail-template-engine'

interface A4MailPreviewProps {
  subject: string
  content: string
  template?: any
  contact?: any
  deputySetting?: {
    name?: string
    constituency?: string
    chamber?: string
    email?: string
    phone?: string
    address?: string
  }
  reference?: string
  assigneeName?: string
  isEditable?: boolean
  onSubjectChange?: (val: string) => void
  onContentChange?: (val: string) => void
  onMissingVariableClick?: (varKey: string) => void
  trackedDiffHtml?: string | null
  showDiffMode?: boolean
}

export default function A4MailPreview({
  subject,
  content,
  template,
  contact,
  deputySetting,
  reference = 'COU-2026-XXXX',
  assigneeName = 'Le Cabinet',
  isEditable = true,
  onSubjectChange,
  onContentChange,
  onMissingVariableClick,
  trackedDiffHtml,
  showDiffMode = false,
}: A4MailPreviewProps) {
  const context: MailVariableContext = {
    contact,
    deputy: deputySetting,
    reference,
    assigneeName,
  }

  const { resolvedText, missingVariables } = resolveVariables(content || '', context)

  const deputyName = deputySetting?.name || 'Jean-Marc TIVOLI'
  const deputyConstituency = deputySetting?.constituency || '1ère circonscription du Rhône'
  const deputyChambre = deputySetting?.chamber || 'ASSEMBLÉE NATIONALE'
  const cabinetAddress = deputySetting?.address || '126 Rue de l\'Université, 75007 Paris'
  const cabinetEmail = deputySetting?.email || 'contact@depute-tivoli.fr'
  const cabinetTel = deputySetting?.phone || '01 40 63 60 00'

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Formatage du bloc destinataire
  const recipientTitle = contact?.title || ''
  const recipientName = contact ? `${contact.firstName || ''} ${contact.lastName ? contact.lastName.toUpperCase() : ''}` : ''
  const recipientOrg = contact?.organization || ''
  const recipientAddress = contact?.address || ''
  const recipientCity = contact?.postalCode && contact?.city ? `${contact.postalCode} ${contact.city}` : contact?.city || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
      {/* Dynamic Alert Banner if missing variables exist */}
      {missingVariables.length > 0 && isEditable && (
        <div style={{
          width: '100%', maxWidth: '210mm', backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#991b1b', fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>
              <strong>{missingVariables.length} variable(s) manquante(s) :</strong> Cliquez sur le badge rouge sur la feuille pour compléter le contact.
            </span>
          </div>
        </div>
      )}

      {/* A4 Sheet Container */}
      <div 
        className="a4-sheet-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
          borderRadius: '2px',
          padding: '20mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
          fontSize: '11pt',
          color: '#1a1a1a',
          lineHeight: '1.5',
          margin: '0 auto',
        }}
      >
        {/* TOP SECTION: Institutional Header (LOCKED) */}
        <div>
          <div style={{
            position: 'relative',
            border: '1px dashed #cbd5e1',
            borderRadius: '6px',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            marginBottom: '2rem',
            cursor: 'not-allowed',
          }}>
            <div style={{
              position: 'absolute', top: '-10px', right: '12px',
              backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.7rem',
              padding: '1px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px',
              fontWeight: 600
            }}>
              <Lock size={10} /> En-tête institutionnel officiel (Verrouillé)
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Left: Deputy Header Info */}
              <div>
                <div style={{ fontSize: '10pt', fontWeight: 'bold', letterSpacing: '0.05em', color: '#0f172a', textTransform: 'uppercase' }}>
                  {deputyChambre}
                </div>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#1e3a8a', marginTop: '2px' }}>
                  {deputyName}
                </div>
                <div style={{ fontSize: '9pt', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                  {deputyConstituency}
                </div>
              </div>

              {/* Right: Date & Reference */}
              <div style={{ textAlign: 'right', fontSize: '10pt', color: '#334155' }}>
                <div>Paris, le {todayStr}</div>
                <div style={{ fontSize: '8.5pt', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                  Réf : {reference}
                </div>
              </div>
            </div>
          </div>

          {/* DESTINATAIRE BLOCK */}
          <div style={{
            marginLeft: 'auto',
            width: '85mm',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: '#fff',
            marginBottom: '2.5rem',
            fontSize: '10.5pt',
            lineHeight: '1.4'
          }}>
            {recipientOrg && <div style={{ fontWeight: 'bold' }}>{recipientOrg}</div>}
            {recipientTitle && <div style={{ fontWeight: 'bold' }}>{recipientTitle}</div>}
            {recipientName && <div style={{ textTransform: 'uppercase', fontWeight: 600 }}>{recipientName}</div>}
            {recipientAddress ? <div>{recipientAddress}</div> : (
              <span 
                className="missing-var-badge" 
                onClick={() => onMissingVariableClick?.('CONTACT_ADRESSE')}
                style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '9pt' }}
              >
                ⚠️ Adresse manquante
              </span>
            )}
            {recipientCity ? <div style={{ fontWeight: 'bold' }}>{recipientCity}</div> : (
              <span 
                className="missing-var-badge" 
                onClick={() => onMissingVariableClick?.('CONTACT_VILLE')}
                style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '9pt' }}
              >
                ⚠️ Ville manquante
              </span>
            )}
          </div>

          {/* EDITABLE SLOT 1: OBJET */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textDecoration: 'underline', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Objet :</span>
              {isEditable ? (
                <input
                  type="text"
                  value={subject}
                  onChange={e => onSubjectChange?.(e.target.value)}
                  placeholder="Objet officiel du courrier..."
                  style={{
                    flex: 1, border: 'none', borderBottom: '1px dashed #cbd5e1',
                    fontSize: '10.5pt', fontWeight: 'bold', fontFamily: 'inherit',
                    padding: '2px 4px', backgroundColor: '#fffbeb', outline: 'none'
                  }}
                />
              ) : (
                <span>{subject}</span>
              )}
            </div>
          </div>

          {/* EDITABLE SLOT 2: CORPS DU COURRIER (OR TRACKED DIFF VIEW) */}
          <div style={{ position: 'relative', minHeight: '120mm' }}>
            {showDiffMode && trackedDiffHtml ? (
              <div 
                style={{
                  padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                  backgroundColor: '#f8fafc', whiteSpace: 'pre-wrap', lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: trackedDiffHtml }}
              />
            ) : isEditable ? (
              <textarea
                value={resolvedText}
                onChange={e => onContentChange?.(e.target.value)}
                placeholder="Rédigez ici le corps du courrier..."
                style={{
                  width: '100%', minHeight: '120mm', border: '1px solid #e2e8f0',
                  borderRadius: '6px', padding: '16px', fontSize: '11pt',
                  fontFamily: 'inherit', lineHeight: '1.6', outline: 'none',
                  resize: 'vertical', backgroundColor: '#fafafa'
                }}
              />
            ) : (
              <div 
                style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: resolvedText }}
              />
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: SIGNATURE & OFFICIAL FOOTER (LOCKED) */}
        <div>
          {/* SIGNATURE BLOCK (LOCKED) */}
          <div style={{
            position: 'relative',
            marginTop: '2rem',
            marginBottom: '2rem',
            textAlign: 'right',
            paddingRight: '1rem',
          }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#1e293b' }}>
              {deputyName}
            </div>
            <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>
              Député
            </div>
            <div style={{ marginTop: '1rem', height: '45px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{
                border: '1px dashed #94a3b8', borderRadius: '4px', padding: '4px 12px',
                fontSize: '8.5pt', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                <Lock size={12} /> Signature Officielle de la Circonscription
              </div>
            </div>
          </div>

          {/* OFFICIAL FOOTER (LOCKED) */}
          <div style={{
            borderTop: '1px solid #cbd5e1',
            paddingTop: '10px',
            textAlign: 'center',
            fontSize: '8.5pt',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>Permanence : {cabinetAddress}</div>
            <div>Tél : {cabinetTel} • Email : {cabinetEmail}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
