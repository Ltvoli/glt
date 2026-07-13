'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, MessageSquare, Loader2, Sparkles, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMessageTemplates, sendBulkCommunicationAction, getGlobalSignatureAction, sendTestCommunicationAction } from './actions'

interface CommunicationClientProps {
  totalTarget: number
  hasEmailCount: number
  hasPhoneCount: number
  firstContact: {
    firstName: string
    lastName: string
    city: string | null
    email: string | null
    mobilePhone: string | null
    phone: string | null
  } | null
  listName?: string
  listId?: string
  ids?: string
  all?: string
  filterParams?: string
}

export default function CommunicationClient({
  totalTarget,
  hasEmailCount,
  hasPhoneCount,
  firstContact,
  listName,
  listId,
  ids,
  all,
  filterParams
}: CommunicationClientProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [signature, setSignature] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  // Fetch signature on mount
  useEffect(() => {
    getGlobalSignatureAction().then(res => {
      setSignature(res)
    })
  }, [])

  // Fetch templates when channel changes
  useEffect(() => {
    setTimeout(() => setIsLoadingTemplates(true), 0)
    getMessageTemplates(channel)
      .then(res => {
        setTemplates(res)
        setSelectedTemplateId('')
      })
      .catch(err => {
        console.error('Error loading templates:', err)
        toast.error('Erreur lors du chargement des modèles.')
      })
      .finally(() => {
        setIsLoadingTemplates(false)
      })
  }, [channel])

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedTemplateId(id)
    if (id === '') {
      setSubject('')
      setContent('')
      return
    }
    const tmpl = templates.find(t => t.id === id)
    if (tmpl) {
      if (tmpl.subject) setSubject(tmpl.subject)
      setContent(tmpl.content)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current
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

  const getPreviewContent = (text: string) => {
    if (!text) return ''
    let replaced = text
      .replace(/{firstName}/g, firstContact?.firstName || 'Jean')
      .replace(/{lastName}/g, firstContact?.lastName || 'Dupont')
      .replace(/{city}/g, firstContact?.city || 'Paris')
      .replace(/{email}/g, firstContact?.email || 'jean.dupont@example.com')
      .replace(/{phone}/g, firstContact?.mobilePhone || firstContact?.phone || '0612345678')

    if (channel === 'EMAIL' && signature) {
      replaced += '\n\n' + signature
    }
    return replaced
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (channel === 'EMAIL' && !subject.trim()) {
      toast.error('Le sujet est obligatoire pour un envoi par Email.')
      return
    }

    if (!content.trim()) {
      toast.error('Le contenu du message est obligatoire.')
      return
    }

    const targetParams = {
      ids: ids ? ids.split(',').filter(Boolean) : undefined,
      listId: listId || undefined,
      all: all === 'true' ? true : undefined,
      filterParams: filterParams || undefined
    }

    setIsSubmitting(true)
    try {
      const res = await sendBulkCommunicationAction(channel, channel === 'EMAIL' ? subject : null, content, targetParams)
      if (res.success) {
        toast.success(`Message groupé envoyé avec succès à ${res.sentCount} contact(s) !`)
        router.push('/contacts/communications')
      } else {
        toast.error(res.error || "Une erreur est survenue lors de l'envoi.")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Une erreur est survenue.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCount = channel === 'EMAIL' ? hasEmailCount : hasPhoneCount
  const missingCount = totalTarget - activeCount
  const hasMissing = missingCount > 0

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Back link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: '#64748b',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
          Console d'Envoi de Message Groupé
        </h1>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
          Composez et personnalisez vos messages pour vos listes ou sélections de contacts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Target Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', margin: '0 0 0.75rem 0', letterSpacing: '0.05em' }}>
              Destinataires ciblés
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {listName ? `Liste : ${listName}` : 'Contacts sélectionnés'}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.82rem', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', color: '#334155', fontWeight: 500 }}>
                  Total ciblé : <strong>{totalTarget}</strong>
                </span>
                <span style={{
                  fontSize: '0.82rem',
                  background: activeCount === totalTarget ? '#d1fae5' : '#fef3c7',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  color: activeCount === totalTarget ? '#065f46' : '#b45309',
                  fontWeight: 500
                }}>
                  Éligibles {channel === 'EMAIL' ? 'Email' : 'SMS'} : <strong>{activeCount}</strong>
                </span>
              </div>

              {hasMissing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginTop: '0.75rem',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}>
                  <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', lineHeight: 1.4 }}>
                    <strong>Attention :</strong> {missingCount} contact(s) n'ont pas de {channel === 'EMAIL' ? 'adresse email' : 'numéro de portable'} renseigné et seront ignorés lors de l'envoi.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Card */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Channel Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Canal d'envoi
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setChannel('EMAIL')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: channel === 'EMAIL' ? 'var(--primary, #3b82f6)' : '#e2e8f0',
                    background: channel === 'EMAIL' ? '#eff6ff' : 'white',
                    color: channel === 'EMAIL' ? 'var(--primary, #3b82f6)' : '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Mail size={18} />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: channel === 'SMS' ? 'var(--primary, #3b82f6)' : '#e2e8f0',
                    background: channel === 'SMS' ? '#eff6ff' : 'white',
                    color: channel === 'SMS' ? 'var(--primary, #3b82f6)' : '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <MessageSquare size={18} />
                  SMS
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label htmlFor="template" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Charger un modèle de message
              </label>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                disabled={isLoadingTemplates}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: 'white',
                }}
              >
                <option value="">-- Aucun modèle (texte libre) --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {isLoadingTemplates && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Chargement des modèles...
                </span>
              )}
            </div>

            {/* Email Subject */}
            {channel === 'EMAIL' && (
              <div>
                <label htmlFor="subject" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Sujet du mail <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="ex: Invitation à notre prochaine réunion publique"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                  }}
                />
              </div>
            )}

            {/* Message Body */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="content" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Message <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {channel === 'SMS' ? `${content.length} caractére(s)` : ''}
                </span>
              </div>
              <textarea
                id="content"
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={channel === 'EMAIL' ? "Rédigez votre email ici..." : "Rédigez votre SMS ici..."}
                required
                rows={channel === 'EMAIL' ? 10 : 5}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Variable Inserter */}
            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                <Sparkles size={14} style={{ color: '#eab308' }} />
                Insérer une variable de personnalisation :
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { tag: '{firstName}', label: 'Prénom' },
                  { tag: '{lastName}', label: 'Nom' },
                  { tag: '{city}', label: 'Ville' },
                  { tag: '{email}', label: 'Email' },
                  { tag: '{phone}', label: 'Téléphone' }
                ].map(v => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariable(v.tag)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || activeCount === 0}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: activeCount === 0 ? '#cbd5e1' : 'var(--primary, #3b82f6)',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.15s',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Envoi en cours...
              </>
            ) : (
              <>
                {channel === 'EMAIL' ? <Mail size={18} /> : <MessageSquare size={18} />}
                Confirmer et envoyer à {activeCount} contact(s)
              </>
            )}
          </button>

          {/* Test Send Button */}
          <button
            type="button"
            disabled={isSendingTest || !content.trim() || (channel === 'EMAIL' && !subject.trim())}
            onClick={async () => {
              if (channel === 'EMAIL' && !subject.trim()) {
                toast.error('Le sujet est obligatoire pour un e-mail de test.')
                return
              }
              if (!content.trim()) {
                toast.error('Le contenu est obligatoire pour un e-mail de test.')
                return
              }

              setIsSendingTest(true)
              try {
                const res = await sendTestCommunicationAction(channel, channel === 'EMAIL' ? subject : null, content)
                if (res.success) {
                  toast.success('Test envoyé avec succès ! Vérifiez votre boîte de réception.')
                } else {
                  toast.error(res.error || 'Erreur lors de l\'envoi du test.')
                }
              } catch (err: any) {
                toast.error(err.message || 'Erreur lors de l\'envoi.')
              } finally {
                setIsSendingTest(false)
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: '2px solid var(--primary, #3b82f6)',
              background: 'white',
              color: 'var(--primary, #3b82f6)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: (!content.trim() || (channel === 'EMAIL' && !subject.trim())) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              marginTop: '0.5rem',
            }}
          >
            {isSendingTest ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>🧪 Envoyer un test à mon adresse</>
            )}
          </button>
        </form>

        {/* Right Column: Live Preview */}
        <div style={{
          position: 'sticky',
          top: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Prévisualisation en temps réel
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Aperçu du message personnalisé pour le premier contact de votre ciblage.
          </p>

          {firstContact ? (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              {/* Preview Header */}
              <div style={{
                background: '#e2e8f0',
                padding: '10px 16px',
                borderBottom: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Destinataire test : {firstContact.firstName} {firstContact.lastName}
                </span>
              </div>

              {/* Preview Body */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {channel === 'EMAIL' && (
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>SUJET :</span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                      {getPreviewContent(subject) || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun sujet rédigé</span>}
                    </div>
                  </div>
                )}
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>MESSAGE :</span>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#334155',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    minHeight: '150px',
                    whiteSpace: 'pre-wrap',
                    fontFamily: channel === 'SMS' ? 'monospace' : 'inherit',
                  }}>
                    {getPreviewContent(content) || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun message rédigé</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.88rem'
            }}>
              Aucun destinataire sélectionné pour générer l'aperçu.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
