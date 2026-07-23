'use client'

import { useState } from 'react'
import { Sparkles, ShieldCheck, Send, CheckCircle2, XCircle, FileCode, Edit3, Loader2, Eye, History } from 'lucide-react'
import A4MailPreview from '@/components/A4MailPreview'
import QuickContactDrawer from '@/components/QuickContactDrawer'
import MailQualityCheckModal from '@/components/MailQualityCheckModal'
import { updateMailContent, updateValidationStatus } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface InstitutionalMailEditorProps {
  mail: any
  templates: any[]
  linkedContact?: any
  deputySetting?: any
  isAdmin?: boolean
}

export default function InstitutionalMailEditor({
  mail,
  templates = [],
  linkedContact,
  deputySetting,
  isAdmin = false
}: InstitutionalMailEditorProps) {
  const [subject, setSubject] = useState(mail.subject || '')
  const [content, setContent] = useState(mail.content || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState(mail.templateId || '')

  const [isSaving, setIsSaving] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

  const [showQcModal, setShowQcModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showContactDrawer, setShowContactDrawer] = useState(false)

  const router = useRouter()

  const handleTemplateSelect = (tmplId: string) => {
    setSelectedTemplateId(tmplId)
    const tmpl = templates.find(t => t.id === tmplId)
    if (tmpl && tmpl.bodyStructure) {
      setContent(tmpl.bodyStructure)
      toast.success(`Modèle "${tmpl.name}" appliqué !`)
    }
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Enregistrement du courrier...")
    try {
      await updateMailContent(mail.id, content, subject, selectedTemplateId || undefined)
      toast.success("Courrier enregistré avec succès", { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur de sauvegarde", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiDraftGeneration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return

    setIsAiGenerating(true)
    const toastId = toast.loading("L'assistant IA rédige le corps du courrier...")
    try {
      const res = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          subject: subject || mail.subject,
          contactName: linkedContact ? `${linkedContact.firstName} ${linkedContact.lastName}` : mail.recipientName
        })
      })

      const data = await res.json()
      if (!res.ok || !data.generatedText) throw new Error(data.error || "Erreur lors de la génération")

      // Inject strictly into body content slot
      setContent((prev: string) => prev ? `${prev}\n\n${data.generatedText}` : data.generatedText)
      toast.success("Ébauche IA injectée dans le corps du texte !", { id: toastId })
      setShowAiModal(false)
      setAiPrompt('')
    } catch (err: any) {
      toast.error(err.message || "Erreur IA", { id: toastId })
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleValidationSubmit = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Soumission du courrier à validation...")
    try {
      await updateMailContent(mail.id, content, subject, selectedTemplateId || undefined)
      await updateValidationStatus(mail.id, 'A_VALIDER')
      toast.success("Courrier soumis à validation avec succès !", { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la soumission", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Validation et approbation du courrier...")
    try {
      await updateMailContent(mail.id, content, subject, selectedTemplateId || undefined)
      await updateValidationStatus(mail.id, 'VALIDE')
      toast.success("Courrier approuvé et validé !", { id: toastId })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la validation", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      toast.error("Veuillez saisir un motif de rejet obligatoirement")
      return
    }

    setIsSaving(true)
    const toastId = toast.loading("Rejet du courrier...")
    try {
      await updateValidationStatus(mail.id, 'REJETE', rejectionReason.trim())
      toast.success("Courrier rejeté avec motif enregisté", { id: toastId })
      setShowRejectModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du rejet", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Action Toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f8fafc' }}>
        {/* Left: Template selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileCode size={20} color="#7c3aed" />
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
              Modèle Institutionnel
            </label>
            <select
              value={selectedTemplateId}
              onChange={e => handleTemplateSelect(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              <option value="">(Pas de modèle / Rédaction libre)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} (v{t.version}.0)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Middle & Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="button outline"
            style={{ borderColor: '#8b5cf6', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={16} /> Rédiger le corps avec l'IA
          </button>

          <button
            type="button"
            onClick={() => setShowQcModal(true)}
            className="button outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ShieldCheck size={16} /> Contrôle Qualité
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="button outline"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>

          {mail.validationStatus !== 'VALIDE' && (
            <button
              type="button"
              onClick={handleValidationSubmit}
              disabled={isSaving}
              className="button primary"
              style={{ backgroundColor: '#2563eb', borderColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Send size={16} /> Soumettre à validation
            </button>
          )}

          {isAdmin && mail.validationStatus === 'A_VALIDER' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="button primary"
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CheckCircle2 size={16} /> Approuver
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isSaving}
                style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <XCircle size={16} /> Rejeter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive A4 Sheet Container */}
      <A4MailPreview
        subject={subject}
        content={content}
        template={templates.find(t => t.id === selectedTemplateId)}
        contact={linkedContact}
        deputySetting={deputySetting}
        reference={mail.reference}
        isEditable={true}
        onSubjectChange={setSubject}
        onContentChange={setContent}
        onMissingVariableClick={() => setShowContactDrawer(true)}
      />

      {/* Quick Contact Drawer */}
      <QuickContactDrawer
        contact={linkedContact}
        isOpen={showContactDrawer}
        onClose={() => setShowContactDrawer(false)}
      />

      {/* QC Modal */}
      <MailQualityCheckModal
        mail={{ ...mail, subject, content }}
        contact={linkedContact}
        isOpen={showQcModal}
        onClose={() => setShowQcModal(false)}
        onProceedToSubmission={handleValidationSubmit}
      />

      {/* AI Prompt Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '1rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f3e8ff', borderRadius: '8px', color: '#7c3aed' }}>
                <Sparkles size={20} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>Rédiger le corps du texte avec l'IA</h3>
            </div>
            <form onSubmit={handleAiDraftGeneration} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Consigne spécifique pour l'IA :
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={4}
                  required
                  placeholder="Ex: Rédiger un paragraphe chaleureux de félicitations pour la récente nomination et rappeler l'attachement du Député aux acteurs locaux..."
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAiModal(false)} className="button outline">Annuler</button>
                <button type="submit" disabled={isAiGenerating} className="button primary" style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isAiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Générer et injecter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '1rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#dc2626' }}>
                <XCircle size={20} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#991b1b' }}>Motif du Rejet Obligatoire</h3>
            </div>
            <form onSubmit={handleReject} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#1e293b' }}>
                  Indiquez les corrections à apporter par le collaborateur :
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Ex: Merci d'ajuster la formule de politesse et de vérifier l'orthographe du titre officiel..."
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} className="button outline">Annuler</button>
                <button type="submit" disabled={isSaving} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
