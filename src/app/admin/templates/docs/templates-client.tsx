'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Layout, Info, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { convertDocxToTemplateAction } from './actions'

export default function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [isSaving, setIsSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entityType, setEntityType] = useState('MAIL')
  
  // Nouveaux états pour le modèle en ligne
  const [templateType, setTemplateType] = useState<'FILE' | 'ONLINE'>('ONLINE')
  const [htmlContent, setHtmlContent] = useState('')

  const router = useRouter()
  const [isProcessingAi, setIsProcessingAi] = useState(false)

  const handleAiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.name.split('.').pop()?.toLowerCase() !== 'docx') {
      toast.error('Seuls les fichiers .docx sont acceptés pour la conversion')
      return
    }

    setIsProcessingAi(true)
    const toastId = toast.loading('Extraction et conversion par IA en cours...')

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer
          const bytes = new Uint8Array(arrayBuffer)
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          resolve(window.btoa(binary))
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
      })

      const base64Data = await base64Promise
      const result = await convertDocxToTemplateAction(base64Data)

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la conversion')
      }

      if (result.htmlContent) {
        setHtmlContent(result.htmlContent)
        toast.success('Modèle Word converti avec succès en HTML !')
      }
      if (result.templateName) {
        setName(result.templateName)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erreur lors de la conversion')
    } finally {
      setIsProcessingAi(false)
      toast.dismiss(toastId)
      e.target.value = ''
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after  = text.substring(end, text.length)
    const newContent = before + variable + after
    setHtmlContent(newContent)
    
    // Rétablir la mise au point et le curseur
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + variable.length
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error('Veuillez fournir un nom de modèle')
      return
    }

    if (templateType === 'FILE' && !file) {
      toast.error('Veuillez sélectionner un fichier DOCX')
      return
    }

    if (templateType === 'ONLINE' && !htmlContent.trim()) {
      toast.error('Veuillez rédiger le contenu du modèle')
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    formData.append('entityType', entityType)

    if (templateType === 'FILE' && file) {
      formData.append('file', file)
    } else {
      formData.append('htmlContent', htmlContent)
    }

    try {
      const res = await fetch('/api/templates/docs/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')

      toast.success(templateType === 'FILE' ? 'Modèle Word uploadé avec succès' : 'Modèle en Ligne créé avec succès')
      setTemplates([data.template, ...templates])
      setFile(null)
      setName('')
      setDescription('')
      setHtmlContent('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const availableVariables = [
    { key: '{en_tete_officielle}', label: 'En-tête Officielle' },
    { key: '{civilite_expediteur}', label: 'Civilité Expéditeur' },
    { key: '{expediteur_prenom}', label: 'Prénom Expéditeur' },
    { key: '{expediteur_nom}', label: 'Nom Expéditeur' },
    { key: '{expediteur_adresse}', label: 'Adresse complète' },
    { key: '{reference}', label: 'Référence courrier' },
    { key: '{objet}', label: 'Objet du courrier' },
    { key: '{date_courrier}', label: 'Date du jour' },
    { key: '{corps_reponse}', label: 'Corps de la réponse' },
    { key: '{signature_elu}', label: 'Signature de l\'Élu' },
    { key: '{nom_collaborateur}', label: 'Nom du Rédacteur' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
        
        {/* Formulaire de création */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            <Layout size={18} style={{ color: 'var(--primary)' }} /> Nouveau Modèle
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nom du modèle</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Réponse Administrative" required />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lié à :</label>
              <select className="form-control" value={entityType} onChange={e => setEntityType(e.target.value)}>
                <option value="MAIL">Courriers (MAIL)</option>
                <option value="CONTACT">Contacts (CONTACT)</option>
                <option value="QE">Questions Écrites (QE)</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Type de modèle</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="radio" checked={templateType === 'ONLINE'} onChange={() => setTemplateType('ONLINE')} /> Modèle en Ligne (HTML)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="radio" checked={templateType === 'FILE'} onChange={() => setTemplateType('FILE')} /> Fichier DOCX (Word)
                </label>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Description (optionnel)</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            {templateType === 'FILE' ? (
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Fichier Modèle (.docx)</label>
                <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} className="form-control" required />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Variables autorisées : {`{prenom}`}, {`{nom}`}, {`{adresse}`}, {`{objet}`}, {`{reference}`}, {`{date}`}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>Corps du modèle (HTML/Texte)</label>
                  <div>
                    <label 
                      htmlFor="ai-docx-upload" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.75rem', 
                        color: 'var(--primary)', 
                        background: '#e0f2fe', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        cursor: isProcessingAi ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        border: '1px dashed var(--primary)'
                      }}
                    >
                      <Sparkles size={12} />
                      {isProcessingAi ? 'Conversion...' : 'Importer un fichier Word par IA'}
                    </label>
                    <input 
                      id="ai-docx-upload" 
                      type="file" 
                      accept=".docx" 
                      onChange={handleAiImport} 
                      style={{ display: 'none' }} 
                      disabled={isProcessingAi}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <textarea 
                      id="htmlContent"
                      className="form-control" 
                      style={{ fontFamily: 'monospace', fontSize: '0.82rem', height: '260px' }}
                      value={htmlContent} 
                      onChange={e => setHtmlContent(e.target.value)} 
                      placeholder="Rédigez le squelette HTML de la lettre..." 
                      required 
                    />
                  </div>
                  
                  {/* Variables dynamiques */}
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.375rem', overflowY: 'auto', maxHeight: '260px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Info size={12} /> Cliquer pour insérer
                    </div>
                    {availableVariables.map(v => (
                      <button 
                        key={v.key} 
                        type="button" 
                        onClick={() => insertVariable(v.key)}
                        style={{ display: 'block', width: '100%', padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '4px', fontSize: '0.7rem', textAlign: 'left', fontWeight: 600, cursor: 'pointer' }}
                        title={`Insérer la balise ${v.key}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="button primary" disabled={isSaving} style={{ marginTop: '0.5rem' }}>
              {isSaving ? 'Enregistrement...' : 'Créer le modèle'}
            </button>
          </form>
        </div>

        {/* Liste des modèles */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Modèles existants ({templates.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {templates.length === 0 && <p className="text-muted">Aucun modèle pour le moment.</p>}
            {templates.map(t => (
              <div key={t.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: t.htmlContent ? '#f0fdf4' : '#eff6ff', color: t.htmlContent ? '#16a34a' : '#3b82f6', borderRadius: '8px' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{t.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Lié à : {t.entityType} | Type : {t.htmlContent ? 'Modèle en ligne (HTML)' : `Fichier Word (${t.originalName})`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
