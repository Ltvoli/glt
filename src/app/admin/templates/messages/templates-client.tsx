'use client'

import React, { useState, useTransition, useRef, useEffect } from 'react'
import { Plus, Trash2, Mail, MessageSquare, Edit2, X, Loader2 } from 'lucide-react'
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from './actions'
import { toast } from 'sonner'
import Script from 'next/script'

type Template = {
  id: string
  name: string
  channel: string
  subject: string | null
  content: string
  design: string | null
  isActive: boolean
  createdAt: Date
  author: {
    firstName: string
    lastName: string
  }
}

type Props = {
  initialTemplates: Template[]
}

export default function TemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // Unlayer state
  const [unlayerLoaded, setUnlayerLoaded] = useState(false)

  // Initialize Unlayer whenever drawer is open and channel is EMAIL
  useEffect(() => {
    if (isOpen && channel === 'EMAIL' && typeof window !== 'undefined' && (window as any).unlayer) {
      const timer = setTimeout(() => {
        const unlayer = (window as any).unlayer
        
        unlayer.init({
          id: 'unlayer-editor-container',
          displayMode: 'email',
          locale: 'fr-FR',
          mergeTags: {
            firstName: { name: 'Prénom', value: '{firstName}' },
            lastName: { name: 'Nom', value: '{lastName}' },
            city: { name: 'Ville', value: '{city}' },
            email: { name: 'E-mail', value: '{email}' },
            phone: { name: 'Téléphone', value: '{phone}' }
          }
        })

        // If editing an existing email template with a saved design, load it
        if (editingTemplate && editingTemplate.channel === 'EMAIL' && editingTemplate.design) {
          try {
            const design = JSON.parse(editingTemplate.design)
            unlayer.loadDesign(design)
          } catch (e) {
            console.error('Failed to load template design:', e)
          }
        } else {
          // Clear editor if it's a new email template
          unlayer.loadDesign({
            body: {
              rows: [
                {
                  cells: [1],
                  columns: [
                    {
                      contents: [
                        {
                          type: 'text',
                          values: {
                            containerPadding: '10px',
                            color: '#000000',
                            textAlign: 'left',
                            text: '<p>Bonjour {firstName} {lastName},</p><p>Saisissez le contenu de votre e-mail ici...</p>'
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          })
        }
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [isOpen, channel, editingTemplate, unlayerLoaded])

  const resetForm = () => {
    setName('')
    setChannel('EMAIL')
    setSubject('')
    setContent('')
    setIsActive(true)
    setEditingTemplate(null)
  }

  const handleEdit = (tmpl: Template) => {
    setEditingTemplate(tmpl)
    setName(tmpl.name)
    setChannel(tmpl.channel as 'EMAIL' | 'SMS')
    setSubject(tmpl.subject || '')
    setContent(tmpl.content)
    setIsActive(tmpl.isActive)
    setIsOpen(true)
  }

  const saveTemplate = (finalContent: string, designStr: string | null) => {
    startTransition(async () => {
      if (editingTemplate) {
        const res = await updateTemplateAction(
          editingTemplate.id,
          name,
          channel,
          subject,
          finalContent,
          isActive,
          designStr
        )
        if (res.success && res.template) {
          toast.success('Modèle mis à jour avec succès.')
          setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { 
            ...t, 
            name, 
            channel, 
            subject, 
            content: finalContent, 
            design: designStr, 
            isActive 
          } as Template : t))
          setIsOpen(false)
          resetForm()
        } else {
          toast.error(res.error || 'Erreur lors de la mise à jour.')
        }
      } else {
        const res = await createTemplateAction(name, channel, subject, finalContent, designStr)
        if (res.success && res.template) {
          toast.success('Modèle créé avec succès.')
          window.location.reload()
        } else {
          toast.error(res.error || 'Erreur lors de la création.')
        }
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (channel === 'EMAIL' && !subject.trim()) {
      toast.error('Le sujet est obligatoire pour un e-mail.')
      return
    }

    if (channel === 'EMAIL') {
      const unlayer = (window as any).unlayer
      if (unlayer) {
        unlayer.exportHtml((data: any) => {
          const { design, html } = data
          saveTemplate(html, JSON.stringify(design))
        })
      } else {
        toast.error('L’éditeur d’e-mail n’est pas disponible.')
      }
    } else {
      // SMS
      if (!content.trim()) {
        toast.error('Le contenu du message est obligatoire.')
        return
      }
      saveTemplate(content, null)
    }
  }

  const handleDelete = async (id: string, tname: string) => {
    if (!confirm(`Supprimer définitivement le modèle "${tname}" ?`)) return
    
    const res = await deleteTemplateAction(id)
    if (res.success) {
      toast.success('Modèle supprimé.')
      setTemplates(prev => prev.filter(t => t.id !== id))
    } else {
      toast.error(res.error || 'Erreur lors de la suppression.')
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = contentRef.current
    if (!textarea) {
      setContent(prev => prev + variable)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    setContent(before + variable + after)
    
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + variable.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <div>
      <Script 
        src="https://editor.unlayer.com/embed.js" 
        strategy="afterInteractive"
        onLoad={() => setUnlayerLoaded(true)}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="button"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
        >
          <Plus size={16} /> Nouveau modèle
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {templates.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucun modèle configuré. Cliquez sur « Nouveau modèle » pour commencer.
          </div>
        ) : (
          templates.map(tmpl => (
            <div key={tmpl.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: tmpl.isActive ? 1 : 0.65 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: tmpl.channel === 'EMAIL' ? '#eff6ff' : '#f0fdf4',
                    color: tmpl.channel === 'EMAIL' ? '#1d4ed8' : '#15803d'
                  }}>
                    {tmpl.channel === 'EMAIL' ? <Mail size={12} /> : <MessageSquare size={12} />}
                    {tmpl.channel}
                  </span>

                  <span style={{ fontSize: '0.7rem', color: tmpl.isActive ? '#15803d' : '#94a3b8', fontWeight: 600 }}>
                    {tmpl.isActive ? 'Actif' : 'Désactivé'}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  {tmpl.name}
                </h4>
                {tmpl.subject && (
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Sujet : {tmpl.subject}
                  </p>
                )}
                <p style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-wrap'
                }}>
                  {tmpl.channel === 'EMAIL' ? '(Modèle e-mail mis en page visuellement)' : tmpl.content}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Par {tmpl.author.firstName} {tmpl.author.lastName}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(tmpl)}
                    className="button outline"
                    style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Edit2 size={11} /> Modif.
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="button danger outline"
                    style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Slide Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1000,
          display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            width: '100%', 
            maxWidth: channel === 'EMAIL' ? '1200px' : '550px', 
            backgroundColor: 'white',
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', 
            overflowY: 'auto',
            transition: 'max-width 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                {editingTemplate ? 'Modifier le modèle' : 'Ajouter un modèle'}
              </h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: channel === 'EMAIL' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Nom du modèle *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex: Relance réunion publique, SMS Urgence"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Canal de diffusion *
                  </label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value as 'EMAIL' | 'SMS')}
                    className="form-control"
                    disabled={!!editingTemplate} // Can't change channel of existing template
                  >
                    <option value="EMAIL">E-mail (Visuel Glisser-Déposer)</option>
                    <option value="SMS">SMS (Texte brut)</option>
                  </select>
                </div>
              </div>

              {channel === 'EMAIL' && (
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Objet du mail *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Objet affiché dans la boîte du destinataire"
                    className="form-control"
                    required
                  />
                </div>
              )}

              {channel === 'EMAIL' ? (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '600px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Création visuelle de l'e-mail (Glisser-Déposer)
                  </label>
                  <div 
                    id="unlayer-editor-container" 
                    style={{ 
                      flex: 1, 
                      minHeight: '550px',
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      overflow: 'hidden' 
                    }} 
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Contenu du message *
                    </label>
                    <textarea
                      ref={contentRef}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Saisissez le corps du message..."
                      className="form-control"
                      rows={8}
                      style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
                      required={channel === 'SMS'}
                    />
                  </div>

                  {/* Variables insertion helper */}
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      💡 Variables de personnalisation cliquables :
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { code: '{firstName}', label: 'Prénom' },
                        { code: '{lastName}', label: 'Nom' },
                        { code: '{city}', label: 'Ville' },
                        { code: '{email}', label: 'E-mail' },
                        { code: '{phone}', label: 'Téléphone' }
                      ].map(v => (
                        <button
                          key={v.code}
                          type="button"
                          onClick={() => insertVariable(v.code)}
                          style={{
                            padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px',
                            border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer',
                            fontWeight: 600, color: '#0f172a'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {editingTemplate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="tmplActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="tmplActive" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Modèle actif et disponible pour l'envoi
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="button outline"
                  style={{ flex: 1, height: '38px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="button"
                  style={{ flex: 1, height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  {isPending && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
