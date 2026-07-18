'use client'

import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Layout, Info, Sparkles, Trash2, Loader2, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { convertDocxToTemplateAction, deleteTemplateAction } from './actions'

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
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // États pour la modale et Quill
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const quillInstanceRef = useRef<any>(null)

  const router = useRouter()
  const [isProcessingAi, setIsProcessingAi] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Initialisation de Quill lors de l'ouverture de la modale en mode ONLINE
  useEffect(() => {
    if (
      isModalOpen &&
      templateType === 'ONLINE' &&
      typeof window !== 'undefined' &&
      (window as any).Quill &&
      editorRef.current &&
      !quillInstanceRef.current
    ) {
      const Quill = (window as any).Quill;
      
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['clean']
          ]
        },
        placeholder: 'Rédigez le squelette HTML de la lettre...'
      });

      quillInstanceRef.current = quill;

      // Charger le contenu initial
      if (htmlContent) {
        quill.clipboard.dangerouslyPasteHTML(htmlContent);
      }

      // Mettre à jour l'état lors de la saisie
      quill.on('text-change', () => {
        setHtmlContent(quill.root.innerHTML);
      });
    }

    // Réinitialiser le ref si la modale se ferme ou si le type change
    return () => {
      if (!isModalOpen || templateType !== 'ONLINE') {
        quillInstanceRef.current = null;
      }
    }
  }, [isModalOpen, templateType, quillLoaded]);

  // Synchronisation bidirectionnelle pour les mises à jour externes (ex: Import IA)
  useEffect(() => {
    if (quillInstanceRef.current) {
      const currentQuillContent = quillInstanceRef.current.root.innerHTML;
      if (htmlContent !== currentQuillContent) {
        quillInstanceRef.current.clipboard.dangerouslyPasteHTML(htmlContent || '');
      }
    }
  }, [htmlContent]);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) return
    setDeletingId(id)
    try {
      const res = await deleteTemplateAction(id)
      if (res.success) {
        setTemplates(templates.filter(t => t.id !== id))
        toast.success('Modèle supprimé avec succès !')
      } else {
        toast.error(res.error || 'Erreur lors de la suppression')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

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
    const quill = quillInstanceRef.current
    if (!quill) return

    quill.focus()
    const range = quill.getSelection()
    if (range) {
      quill.insertText(range.index, variable, 'user')
      quill.setSelection(range.index + variable.length, 0, 'user')
    } else {
      const length = quill.getLength()
      quill.insertText(length - 1, variable, 'user')
      quill.setSelection(length - 1 + variable.length, 0, 'user')
    }
  }

  const handleCancelEdit = () => {
    setEditingTemplateId(null)
    setFile(null)
    setName('')
    setDescription('')
    setHtmlContent('')
    setTemplateType('ONLINE')
    setEntityType('MAIL')
    setIsModalOpen(false)
    quillInstanceRef.current = null
  }

  const handleNewTemplate = () => {
    setEditingTemplateId(null)
    setFile(null)
    setName('')
    setDescription('')
    setHtmlContent('')
    setTemplateType('ONLINE')
    setEntityType('MAIL')
    setIsModalOpen(true)
  }

  const handleSelectTemplate = (t: any) => {
    setEditingTemplateId(t.id)
    setName(t.name)
    setDescription(t.description || '')
    setEntityType(t.entityType)
    if (t.htmlContent !== null) {
      setTemplateType('ONLINE')
      setHtmlContent(t.htmlContent)
      setFile(null)
    } else {
      setTemplateType('FILE')
      setHtmlContent('')
      setFile(null)
    }
    setIsModalOpen(true)
    toast.info(`Édition du modèle "${t.name}"`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error('Veuillez fournir un nom de modèle')
      return
    }

    if (!editingTemplateId && templateType === 'FILE' && !file) {
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
    formData.append('description', description || '')
    formData.append('entityType', entityType)

    if (editingTemplateId) {
      formData.append('id', editingTemplateId)
    }

    if (templateType === 'FILE') {
      if (file) formData.append('file', file)
    } else {
      formData.append('htmlContent', htmlContent)
    }

    try {
      const url = '/api/templates/docs/upload'
      const method = editingTemplateId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')

      toast.success(editingTemplateId ? 'Modèle mis à jour avec succès' : (templateType === 'FILE' ? 'Modèle Word uploadé avec succès' : 'Modèle en Ligne créé avec succès'))
      
      if (editingTemplateId) {
        setTemplates(templates.map(t => t.id === editingTemplateId ? data.template : t))
      } else {
        setTemplates([data.template, ...templates])
      }
      
      handleCancelEdit()
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
      {/* Chargement dynamique de Quill */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css" />
      <Script 
        src="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js" 
        strategy="afterInteractive"
        onLoad={() => setQuillLoaded(true)}
      />

      {/* Barre d'action avec bouton pour ouvrir la modale */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          onClick={handleNewTemplate}
          className="button primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
        >
          <Plus size={16} /> Nouveau modèle
        </button>
      </div>

      {/* Liste des modèles sous forme de grille */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Modèles existants ({templates.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {templates.length === 0 && <p className="text-muted" style={{ gridColumn: '1 / -1' }}>Aucun modèle pour le moment.</p>}
          {templates.map(t => (
            <div 
              key={t.id} 
              style={{ 
                padding: '1.25rem', 
                border: '1px solid #e2e8f0', 
                borderRadius: '10px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: '#fff',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)'
              }}
              className="template-card"
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div 
                onClick={() => handleSelectTemplate(t)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flex: 1 }}
                title="Cliquer pour modifier ce modèle"
              >
                <div style={{ padding: '0.75rem', background: t.htmlContent !== null ? '#f0fdf4' : '#eff6ff', color: t.htmlContent !== null ? '#16a34a' : '#3b82f6', borderRadius: '8px' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{t.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    Lié à : {t.entityType} | Type : {t.htmlContent !== null ? 'Modèle en ligne (HTML)' : `Fichier Word (${t.originalName || 'Word'})`}
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => handleDelete(t.id)} 
                disabled={deletingId !== null}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--danger, #ef4444)', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Supprimer ce modèle"
              >
                {deletingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modale Plein Écran de Rédaction */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
            animation: 'modalFadeIn 0.2s ease-out'
          }}
        >
          <div 
            style={{
              width: '95vw',
              height: '90vh',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'modalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header de la modale */}
            <div 
              style={{
                padding: '1.25rem 2rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layout size={20} style={{ color: 'var(--primary)' }} />
                  {editingTemplateId ? 'Modifier le modèle de document' : 'Nouveau modèle de document'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {editingTemplateId ? 'Mettez à jour les informations et le contenu de votre modèle.' : 'Créez un nouveau modèle de document en ligne ou importez un fichier Word.'}
                </p>
              </div>
              <button 
                onClick={handleCancelEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Contenu principal de la modale */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Section 1 : Métadonnées du modèle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Nom du modèle</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Ex: Réponse Administrative" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Lié à :</label>
                    <select className="form-control" value={entityType} onChange={e => setEntityType(e.target.value)}>
                      <option value="MAIL">Courriers (MAIL)</option>
                      <option value="CONTACT">Contacts (CONTACT)</option>
                      <option value="QE">Questions Écrites (QE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Type de modèle</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.6rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" checked={templateType === 'ONLINE'} onChange={() => setTemplateType('ONLINE')} style={{ width: '1rem', height: '1rem' }} /> Modèle en Ligne (HTML)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" checked={templateType === 'FILE'} onChange={() => setTemplateType('FILE')} style={{ width: '1rem', height: '1rem' }} /> Fichier DOCX (Word)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 2 : Description du modèle */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Description (optionnel)</label>
                  <textarea 
                    className="form-control" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={2} 
                    placeholder="Décrivez l'usage de ce modèle..."
                  />
                </div>

                {/* Section 3 : Zone de contenu/fichier */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                  {templateType === 'FILE' ? (
                    <div 
                      style={{ 
                        border: '2px dashed #cbd5e1', 
                        borderRadius: '8px', 
                        padding: '2.5rem', 
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        flex: 1
                      }}
                    >
                      <Upload size={40} style={{ color: '#94a3b8' }} />
                      <div>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem', color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                          Fichier Modèle Word (.docx)
                        </label>
                        <input 
                          type="file" 
                          accept=".docx" 
                          onChange={e => setFile(e.target.files?.[0] || null)} 
                          className="form-control" 
                          style={{ maxWidth: '400px', margin: '0 auto' }}
                          required={!editingTemplateId} 
                        />
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {editingTemplateId ? 'Optionnel : déposez un nouveau fichier pour remplacer le fichier Word existant.' : 'Obligatoire : fichier de base Word.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      
                      {/* Barre de contrôle avec bouton IA */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155', margin: 0 }}>
                          Corps du modèle (Éditeur Visuel WYSIWYG)
                        </label>
                        <div>
                          <label 
                            htmlFor="ai-docx-upload" 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              fontSize: '0.85rem', 
                              color: 'var(--primary)', 
                              background: '#e0f2fe', 
                              padding: '0.4rem 0.8rem', 
                              borderRadius: '6px', 
                              cursor: isProcessingAi ? 'not-allowed' : 'pointer',
                              fontWeight: 600,
                              border: '1px dashed var(--primary)',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => !isProcessingAi && (e.currentTarget.style.backgroundColor = '#bae6fd')}
                            onMouseLeave={e => !isProcessingAi && (e.currentTarget.style.backgroundColor = '#e0f2fe')}
                          >
                            <Sparkles size={14} />
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

                      {/* Zone d'édition double colonne */}
                      <div style={{ display: 'grid', gridTemplateColumns: '3.2fr 1fr', gap: '1.25rem', flex: 1, minHeight: '250px' }}>
                        {/* Éditeur Quill */}
                        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <div ref={editorRef} style={{ flex: 1, overflowY: 'auto' }} />
                        </div>
                        
                        {/* Variables dynamiques */}
                        <div 
                          style={{ 
                            background: '#f8fafc', 
                            padding: '0.85rem', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.4rem', 
                            overflowY: 'auto',
                            maxHeight: '340px'
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Info size={14} /> Cliquer pour insérer
                          </div>
                          {availableVariables.map(v => (
                            <button 
                              key={v.key} 
                              type="button" 
                              onClick={() => insertVariable(v.key)}
                              style={{ 
                                display: 'block', 
                                width: '100%', 
                                padding: '0.4rem 0.6rem', 
                                background: 'white', 
                                color: '#0f172a', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                textAlign: 'left', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, border-color 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                              }}
                              title={`Insérer la balise ${v.key}`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>

              {/* Pied de la modale */}
              <div 
                style={{
                  padding: '1rem 2rem',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '1rem'
                }}
              >
                <button 
                  type="button" 
                  onClick={handleCancelEdit} 
                  className="button outline" 
                  disabled={isSaving}
                  style={{ minWidth: '100px' }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="button primary" 
                  disabled={isSaving}
                  style={{ minWidth: '150px' }}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
