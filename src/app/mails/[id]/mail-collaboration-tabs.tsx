'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, MessageSquare, History, Send, ChevronRight, Printer, Sparkles } from 'lucide-react'
import { addMailComment, updateMailContentAction, generateAiResponseAction } from '../actions'
import { toast } from 'sonner'
import { diffWords, DiffChange } from '@/lib/diff'

type Version = {
  id: string
  subject: string
  content: string | null
  createdAt: Date | string
  editedBy: { firstName: string; lastName: string }
}

type Comment = {
  id: string
  content: string
  createdAt: Date | string
  author: { firstName: string; lastName: string }
}

type MailCollaborationTabsProps = {
  mail: {
    id: string
    subject: string
    content: string | null
    recipientName: string | null
    senderName: string | null
    city: string | null
    type: string
    validationStatus: string | null
    rejectionReason: string | null
    versions: Version[]
    comments: Comment[]
    receiveDate?: Date | string | null
    sentDate?: Date | string | null
    createdAt?: Date | string
  }
  currentUserId: string
}

let quillLoadingPromise: Promise<any> | null = null

function loadQuill(): Promise<any> {
  if (quillLoadingPromise) return quillLoadingPromise

  quillLoadingPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'))
      return
    }

    if ((window as any).Quill) {
      resolve((window as any).Quill)
      return
    }

    try {
      const link = document.createElement('link')
      link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css'
      link.rel = 'stylesheet'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js'
      script.onload = () => {
        resolve((window as any).Quill)
      }
      script.onerror = (err) => {
        quillLoadingPromise = null
        reject(err)
      }
      document.body.appendChild(script)
    } catch (err) {
      quillLoadingPromise = null
      reject(err)
    }
  })

  return quillLoadingPromise
}

export default function MailCollaborationTabs({ mail, currentUserId }: MailCollaborationTabsProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'comments' | 'history'>('preview')
  
  // Comments state
  const [commentsList, setCommentsList] = useState<Comment[]>(mail.comments)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Version diff state
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editorContent, setEditorContent] = useState(mail.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // AI assistant state
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiSuggestionText, setAiSuggestionText] = useState('')

  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)

  // Autosave Effect
  useEffect(() => {
    if (!isEditing) return

    const interval = setInterval(async () => {
      if (hasUnsavedChanges && quillRef.current) {
        const currentContent = quillRef.current.root.innerHTML
        setIsSaving(true)
        try {
          const res = await updateMailContentAction(mail.id, currentContent)
          if (res.success) {
            setHasUnsavedChanges(false)
            setEditorContent(currentContent)
            const now = new Date()
            setLastSavedTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
          }
        } catch (err) {
          console.error("Autosave error:", err)
        } finally {
          setIsSaving(false)
        }
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [isEditing, hasUnsavedChanges, mail.id])

  const enterEditMode = async () => {
    setIsEditing(true)
    try {
      const Quill = await loadQuill()
      setTimeout(() => {
        if (editorRef.current && !quillRef.current) {
          quillRef.current = new Quill(editorRef.current, {
            theme: 'snow',
            modules: {
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
              ]
            }
          })
          quillRef.current.root.innerHTML = editorContent
          
          quillRef.current.on('text-change', () => {
            setHasUnsavedChanges(true)
          })
        }
      }, 100)
    } catch (err) {
      toast.error("Impossible de charger l'éditeur Quill")
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm("Voulez-vous vraiment annuler ? Vos modifications non sauvegardées seront perdues.")) {
        setIsEditing(false)
        if (quillRef.current) {
          quillRef.current = null
        }
        setHasUnsavedChanges(false)
      }
    } else {
      setIsEditing(false)
      if (quillRef.current) {
        quillRef.current = null
      }
    }
  }

  const handleSave = async () => {
    if (!quillRef.current) return
    setIsSaving(true)
    const currentContent = quillRef.current.root.innerHTML
    try {
      const res = await updateMailContentAction(mail.id, currentContent)
      if (res.success) {
        setHasUnsavedChanges(false)
        toast.success("Modifications enregistrées !")
        setEditorContent(currentContent)
        setIsEditing(false)
        if (quillRef.current) {
          quillRef.current = null
        }
        window.location.reload()
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement")
      }
    } catch (err) {
      toast.error("Erreur de communication")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAiResponse = async () => {
    if (!aiInstruction.trim()) return
    setIsGeneratingAi(true)
    setAiSuggestionText('')
    try {
      const res = await generateAiResponseAction(mail.id, aiInstruction)
      if (res.success && res.text) {
        setAiSuggestionText(res.text)
        toast.success("Réponse générée avec succès !")
      } else {
        toast.error(res.error || "Échec de génération de réponse")
      }
    } catch (err) {
      toast.error("Erreur de connexion au serveur")
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleInsertAiSuggestion = () => {
    if (!aiSuggestionText || !quillRef.current) return
    const quill = quillRef.current
    const range = quill.getSelection()
    
    if (range) {
      quill.clipboard.dangerouslyPasteHTML(range.index, aiSuggestionText)
    } else {
      const currentHtml = quill.root.innerHTML
      if (currentHtml.includes('{corps_reponse}')) {
        const newHtml = currentHtml.replace('{corps_reponse}', aiSuggestionText)
        quill.root.innerHTML = newHtml
      } else {
        quill.clipboard.dangerouslyPasteHTML(quill.getLength(), aiSuggestionText)
      }
    }
    setHasUnsavedChanges(true)
    toast.success("Suggestion insérée dans l'éditeur")
  }

  const handlePrintDirect = () => {
    document.body.classList.add('printing-letter-only')
    window.print()
    setTimeout(() => {
      document.body.classList.remove('printing-letter-only')
    }, 1000)
  }

  const handleTabChange = (tab: 'preview' | 'comments' | 'history') => {
    if (isEditing && hasUnsavedChanges) {
      if (!confirm("Vos modifications non sauvegardées seront perdues. Voulez-vous continuer ?")) {
        return
      }
    }
    if (quillRef.current) {
      quillRef.current = null
    }
    setIsEditing(false)
    setHasUnsavedChanges(false)
    setActiveTab(tab)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const res = await addMailComment(mail.id, newComment)
      if (res.error) {
        toast.error(res.error)
      } else if (res.comment) {
        const added: Comment = {
          id: res.comment.id,
          content: res.comment.content,
          createdAt: res.comment.createdAt,
          author: res.comment.author
        }
        setCommentsList([...commentsList, added])
        setNewComment('')
        toast.success('Commentaire ajouté !')
      }
    } catch (err) {
      toast.error('Erreur de communication avec le serveur')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const getFormattedDate = () => {
    const d = mail.type === 'ENTRANT'
      ? (mail.receiveDate ? new Date(mail.receiveDate) : (mail.createdAt ? new Date(mail.createdAt) : new Date()))
      : (mail.sentDate ? new Date(mail.sentDate) : (mail.createdAt ? new Date(mail.createdAt) : new Date()))
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }
  const dateStr = getFormattedDate()

  const renderDiff = (oldText: string, newText: string) => {
    const diff = diffWords(oldText, newText)
    return (
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid var(--border)', 
          fontSize: '0.9rem', 
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}
      >
        {diff.map((change: DiffChange, idx: number) => {
          if (change.type === 'added') {
            return (
              <span key={idx} style={{ backgroundColor: '#dcfce7', color: '#166534', textDecoration: 'none', padding: '0.1rem 0.2rem', borderRadius: '2px' }}>
                {change.value}
              </span>
            )
          }
          if (change.type === 'removed') {
            return (
              <span key={idx} style={{ backgroundColor: '#fee2e2', color: '#991b1b', textDecoration: 'line-through', padding: '0.1rem 0.2rem', borderRadius: '2px' }}>
                {change.value}
              </span>
            )
          }
          return <span key={idx}>{change.value}</span>
        })}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Tabs headers */}
      <div 
        className="no-print" 
        style={{ 
          display: 'flex', 
          borderBottom: '2px solid var(--border)', 
          marginBottom: '1.5rem',
          gap: '1rem'
        }}
      >
        <button
          onClick={() => handleTabChange('preview')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'preview' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'preview' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <FileText size={18} /> {mail.type === 'SORTANT' ? 'Aperçu Papier Officiel' : 'Contenu du courrier'}
        </button>

        <button
          onClick={() => handleTabChange('comments')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'comments' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'comments' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <MessageSquare size={18} /> Commentaires ({commentsList.length})
        </button>

        {mail.type === 'SORTANT' && (
          <button
            onClick={() => handleTabChange('history')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '-2px'
            }}
          >
            <History size={18} /> Historique ({mail.versions.length})
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Actions bar above the letter */}
          <div 
            className="no-print" 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              backgroundColor: '#f8fafc', 
              padding: '0.75rem 1.25rem', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0' 
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                {isEditing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: '#eab308' 
                      }}
                    ></span>
                    Édition en cours...
                  </span>
                ) : (
                  "Aperçu du document"
                )}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {!isEditing ? (
                <>
                  <button 
                    onClick={enterEditMode}
                    className="button"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    <FileText size={16} />
                    {mail.type === 'SORTANT' ? 'Modifier la réponse' : 'Modifier le courrier'}
                  </button>
                  <button 
                    onClick={handlePrintDirect}
                    className="button outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    <Printer size={16} />
                    Imprimer / PDF
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {lastSavedTime && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginRight: '0.5rem' }}>
                      Brouillon sauvegardé à {lastSavedTime}
                    </span>
                  )}
                  <button
                    onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                    className="button outline"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.875rem', 
                      border: isAiPanelOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isAiPanelOpen ? '#eff6ff' : 'transparent',
                      color: isAiPanelOpen ? 'var(--primary)' : 'var(--text)'
                    }}
                  >
                    <Sparkles size={16} />
                    Assistant IA ✨
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <style>{`
            @media print {
              body.printing-letter-only {
                background: white !important;
              }
              body.printing-letter-only * {
                visibility: hidden !important;
              }
              body.printing-letter-only #letter-to-print,
              body.printing-letter-only #letter-to-print * {
                visibility: visible !important;
              }
              body.printing-letter-only #letter-to-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
            }
          `}</style>

          <div style={{ display: 'grid', gridTemplateColumns: isEditing && isAiPanelOpen ? '2.2fr 1fr' : '1fr', gap: '1.5rem' }}>
            <div 
              id="letter-to-print"
              className="card"
              style={{ 
                backgroundColor: '#ffffff', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: isEditing ? '2rem' : '3.5rem',
                minHeight: '600px',
                fontFamily: 'Georgia, serif',
                color: '#1e293b',
                lineHeight: '1.6',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1, gap: '1.5rem' }}>
                  <div style={{ flexGrow: 1 }} className="quill-editor-container">
                    <div ref={editorRef} style={{ minHeight: '400px', fontFamily: 'Georgia, serif', fontSize: '1rem' }} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: 'auto' }}>
                    <button 
                      onClick={handleCancel}
                      className="button outline"
                      style={{ padding: '0.5rem 1.25rem' }}
                      disabled={isSaving}
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleSave}
                      className="button"
                      style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {mail.content && (mail.content.includes('<') && mail.content.includes('>')) ? (
                    <div 
                      style={{ 
                        fontSize: '1rem', 
                        minHeight: '200px', 
                        color: '#334155',
                        textAlign: 'justify'
                      }}
                      dangerouslySetInnerHTML={{ __html: mail.content || 'Rédigez le contenu du courrier...' }}
                    />
                  ) : (
                    <>
                      {/* Letterhead (Only for outgoing mails) */}
                      {mail.type === 'SORTANT' ? (
                        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '2px double #cbd5e1', paddingBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0f172a', fontWeight: 'bold', fontFamily: 'system-ui, sans-serif' }}>
                            Assemblée nationale
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a', marginTop: '0.5rem' }}>
                            Lionel TIVOLI
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>
                            Député des Alpes-Maritimes
                          </div>
                        </div>
                      ) : (
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#475569', fontFamily: 'system-ui, sans-serif' }}>
                            Courrier reçu (Entrant)
                          </div>
                        </div>
                      )}

                      {/* Date and City */}
                      <div style={{ textAlign: 'right', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        {mail.type === 'SORTANT' ? `Nice, le ${dateStr}` : `Reçu le ${dateStr}`}
                      </div>

                      {/* Sender / Recipient block */}
                      {mail.type === 'ENTRANT' ? (
                        <div style={{ marginRight: 'auto', width: '55%', marginBottom: '3rem', fontSize: '0.95rem', fontFamily: 'system-ui, sans-serif', padding: '0.5rem', borderLeft: '3px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Expéditeur</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{mail.senderName || '(Expéditeur non renseigné)'}</div>
                          {mail.city && <div style={{ color: '#475569' }}>{mail.city}</div>}
                        </div>
                      ) : (
                        <div style={{ marginLeft: 'auto', width: '55%', marginBottom: '3rem', fontSize: '0.95rem', fontFamily: 'system-ui, sans-serif', padding: '0.5rem', borderLeft: '3px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Destinataire</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{mail.recipientName || mail.senderName || '(Destinataire non renseigné)'}</div>
                          {mail.city && <div style={{ color: '#475569' }}>{mail.city}</div>}
                        </div>
                      )}

                      {/* Subject */}
                      <div style={{ marginBottom: '2.5rem', fontWeight: 'bold', fontSize: '0.95rem', fontFamily: 'system-ui, sans-serif' }}>
                        Objet : <span style={{ fontWeight: 500 }}>{mail.subject}</span>
                      </div>

                      {/* Letter Content */}
                      <div 
                        style={{ 
                          fontSize: '1rem', 
                          whiteSpace: 'pre-wrap', 
                          minHeight: '200px', 
                          color: '#334155',
                          textAlign: 'justify'
                        }}
                      >
                        {mail.content || 'Rédigez le contenu du courrier...'}
                      </div>

                      {/* Signature Block (Only for outgoing mails) */}
                      {mail.type === 'SORTANT' && (
                        <div style={{ marginLeft: 'auto', width: '45%', marginTop: '4rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            Lionel TIVOLI
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                            Député
                          </div>
                          <div 
                            style={{ 
                              marginTop: '1rem', 
                              fontFamily: 'Georgia, serif', 
                              fontSize: '1.5rem', 
                              fontStyle: 'italic', 
                              color: '#2563eb',
                              opacity: 0.8 
                            }}
                          >
                            [Signature Officielle]
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* AI Panel Column */}
            {isEditing && isAiPanelOpen && (
              <div 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  height: 'fit-content', 
                  border: '1px solid #93c5fd', 
                  backgroundColor: '#f8fafc',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #bfdbfe', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                    <Sparkles size={16} /> Assistant IA ✨
                  </h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>Consignes de rédaction :</label>
                  <textarea
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="Ex: Réfuse poliment de participer à cette réunion et propose un autre rendez-vous le 12 octobre à 10h."
                    className="form-control"
                    rows={4}
                    style={{ fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>
                
                <button
                  onClick={handleGenerateAiResponse}
                  className="button"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: 600 }}
                  disabled={isGeneratingAi || !aiInstruction.trim()}
                >
                  {isGeneratingAi ? 'Génération...' : 'Générer avec Gemini'}
                </button>
                
                {aiSuggestionText && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px dashed #bfdbfe', paddingTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>Suggestion générée :</label>
                    <div 
                      style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #bfdbfe', 
                        borderRadius: '6px', 
                        padding: '0.75rem', 
                        fontSize: '0.85rem', 
                        maxHeight: '200px', 
                        overflowY: 'auto',
                        lineHeight: '1.5',
                        fontFamily: 'Georgia, serif'
                      }}
                      dangerouslySetInnerHTML={{ __html: aiSuggestionText }}
                    />
                    <button
                      onClick={handleInsertAiSuggestion}
                      className="button outline"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8' }}
                    >
                      Insérer la suggestion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {activeTab === 'comments' && (
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Discussion de validation</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {commentsList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Aucune remarque pour le moment. Utilisez ce fil pour demander ou suggérer des corrections.</p>
            ) : (
              commentsList.map(comment => (
                <div 
                  key={comment.id} 
                  style={{ 
                    padding: '0.75rem 1rem', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    maxWidth: '85%',
                    alignSelf: 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {comment.author.firstName} {comment.author.lastName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(comment.createdAt).toLocaleDateString('fr-FR')} à {new Date(comment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Écrire une remarque ou demander une correction..."
              className="form-control"
              rows={2}
              style={{ resize: 'none', fontSize: '0.875rem' }}
              disabled={isSubmittingComment}
            />
            <button 
              type="submit" 
              className="button" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', flexShrink: 0 }}
              disabled={isSubmittingComment || !newComment.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Versions list */}
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Versions archivées</h3>
            {mail.versions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>Aucune révision enregistrée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {mail.versions.map((ver, idx) => (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: selectedVersion?.id === ver.id ? '#eff6ff' : '#ffffff',
                      borderColor: selectedVersion?.id === ver.id ? '#3b82f6' : 'var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}>
                      Version #{mail.versions.length - idx} <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Modifié par : {ver.editedBy.firstName} {ver.editedBy.lastName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Le {new Date(ver.createdAt).toLocaleDateString('fr-FR')} à {new Date(ver.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Diff view */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedVersion ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>
                    Comparaison : Version sélectionnée ➔ Version actuelle
                  </h3>
                  <button 
                    onClick={() => setSelectedVersion(null)} 
                    className="button outline"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Fermer
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sujet du courrier :</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {selectedVersion.subject !== mail.subject ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#991b1b', backgroundColor: '#fee2e2', padding: '0 0.2rem' }}>
                          {selectedVersion.subject}
                        </span>
                        {' ➔ '}
                        <span style={{ color: '#166534', backgroundColor: '#dcfce7', padding: '0 0.2rem' }}>
                          {mail.subject}
                        </span>
                      </>
                    ) : (
                      mail.subject
                    )}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Comparatif du contenu :</p>
                  {renderDiff(selectedVersion.content || '', mail.content || '')}
                </div>
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', borderStyle: 'dashed', color: 'var(--text-muted)' }}>
                <History size={36} style={{ strokeWidth: 1.5, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem' }}>Sélectionnez une version dans la colonne de gauche pour voir les modifications apportées.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
