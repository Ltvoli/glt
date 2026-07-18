'use client'

import React, { useState, useTransition } from 'react'
import { FileText, Printer, Mail, Save, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { sendMailPdfByEmailAction } from '../../actions'

type PreviewClientProps = {
  mail: any
  templates: any[]
  variablesMap: Record<string, string>
  primaryContactEmail: string
  primaryContactName: string
}

export default function PreviewClient({ mail, templates, variablesMap, primaryContactEmail, primaryContactName }: PreviewClientProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '')
  const [isPending, startTransition] = useTransition()
  const [isSent, setIsSent] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const activeTemplate = templates.find(t => t.id === selectedTemplateId)

  // Fusionner les variables dans le template HTML
  const getMergedHtml = () => {
    // Si le contenu est déjà au format HTML (modèle déjà fusionné et appliqué)
    if (mail.content && mail.content.includes('<') && mail.content.includes('>')) {
      return mail.content
    }

    if (!activeTemplate || !activeTemplate.htmlContent) return ''
    let content = activeTemplate.htmlContent

    // Remplacer toutes les balises par leurs valeurs
    Object.entries(variablesMap).forEach(([key, value]) => {
      // Échapper les caractères spéciaux regexp
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      content = content.replace(new RegExp(escapedKey, 'g'), value)
    })

    return content
  }

  const mergedHtml = getMergedHtml()

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = () => {
    if (!primaryContactEmail) {
      toast.error("Le contact lié n'a pas d'adresse e-mail configurée.")
      return
    }

    startTransition(async () => {
      try {
        // Pour l'envoi email, on envoie le contenu HTML fusionné directement
        const res = await sendMailPdfByEmailAction(
          mail.id,
          Buffer.from(mergedHtml).toString('base64'),
          `Lettre_Reponse_${mail.reference}.html`,
          primaryContactEmail,
          primaryContactName
        )
        if (res.success) {
          toast.success('E-mail envoyé avec succès avec la lettre en pièce jointe !')
          setIsSent(true)
        } else {
          toast.error("Erreur lors de l'envoi de l'e-mail.")
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'envoi.")
      }
    })
  }

  const handleSaveToCrm = () => {
    startTransition(async () => {
      try {
        // Appeler l'action d'archivage HTML (que nous allons ajouter)
        const { archiveMailHtmlAction } = await import('../../actions')
        const res = await archiveMailHtmlAction(
          mail.id,
          mergedHtml,
          `Lettre_Reponse_${mail.reference}.html`
        )
        if (res.success) {
          toast.success('Lettre enregistrée dans les documents du courrier !')
          setIsSaved(true)
        } else {
          toast.error("Erreur lors de l'enregistrement.")
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'enregistrement.")
      }
    })
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" rel="stylesheet" />

      <style>{`
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 25mm 20mm;
          margin: 1.5rem auto;
          background: white;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-sizing: border-box;
          text-align: left;
          color: #1e293b;
        }

        .a4-page p {
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        @media print {
          nav, header, .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page {
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        
        {/* Panneau latéral de contrôle */}
        <div className="card no-print" style={{ padding: '1.5rem', alignSelf: 'start', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Options d'édition
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sélectionner un modèle</label>
              {mail.content && mail.content.includes('<') && mail.content.includes('>') ? (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', color: '#166534', fontWeight: 500 }}>
                  ✓ Modèle HTML appliqué et enregistré sur la fiche courrier.
                </div>
              ) : (
                <select 
                  className="form-control" 
                  value={selectedTemplateId} 
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  style={{ marginTop: '0.25rem' }}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={handlePrint}
                className="button outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <Printer size={16} /> Imprimer / Télécharger PDF
              </button>

              <button 
                type="button" 
                onClick={handleSaveToCrm}
                disabled={isPending || isSaved || !selectedTemplateId}
                className="button outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', borderColor: isSaved ? 'var(--success)' : '', color: isSaved ? 'var(--success)' : '' }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
                {isSaved ? 'Enregistré dans le CRM' : 'Enregistrer dans le CRM'}
              </button>

              <button 
                type="button" 
                onClick={handleSendEmail}
                disabled={isPending || isSent || !selectedTemplateId}
                className="button"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', backgroundColor: isSent ? 'var(--success)' : '' }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : isSent ? <CheckCircle size={16} /> : <Mail size={16} />}
                {isSent ? 'E-mail envoyé' : 'Envoyer par E-mail'}
              </button>
            </div>

            {primaryContactEmail && (
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Destinataire :</strong> {primaryContactName} ({primaryContactEmail})
              </div>
            )}
          </div>
        </div>

        {/* Page A4 visualisée */}
        <div style={{ textAlign: 'center' }}>
          {mergedHtml ? (
            <div className="a4-page" id="letter-page" dangerouslySetInnerHTML={{ __html: mergedHtml }} />
          ) : (
            <div className="card" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
              Veuillez sélectionner un modèle pour générer le courrier.
            </div>
          )}
        </div>

      </div>
    </>
  )
}
