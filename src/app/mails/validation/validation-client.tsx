'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, XCircle, ArrowLeft, Clock, User, FileText, Send, HelpCircle } from 'lucide-react'
import { validateMail, rejectMail } from '../actions'
import { toast } from 'sonner'
import { diffWords, DiffChange } from '@/lib/diff'

type Version = {
  id: string
  content: string | null
  createdAt: string | Date
  editedBy: { firstName: string; lastName: string }
}

type Mail = {
  id: string
  reference: string
  subject: string
  content: string | null
  recipientName: string | null
  senderName: string | null
  city: string | null
  type: string
  urgency: string
  createdAt: string | Date
  assignee: { name: string } | null
  versions?: Version[]
}

type ValidationClientProps = {
  initialMails: Mail[]
  isAdmin: boolean
}

export default function MailValidationExpressClient({ initialMails, isAdmin }: ValidationClientProps) {
  const [mails, setMails] = useState<Mail[]>(initialMails)
  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [isPending, setIsPending] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  const activeMail = mails[selectedIdx] || null

  const handleValidate = async () => {
    if (!activeMail) return
    setIsPending(true)
    try {
      const res = await validateMail(activeMail.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Courrier ${activeMail.reference} validé !`)
        removeActiveMail()
      }
    } catch (e) {
      toast.error('Erreur lors de la validation')
    } finally {
      setIsPending(false)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeMail) return
    setIsPending(true)
    try {
      const res = await rejectMail(activeMail.id, rejectionReason)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Courrier ${activeMail.reference} rejeté avec motif`)
        setRejectionReason('')
        setShowRejectForm(false)
        removeActiveMail()
      }
    } catch (e) {
      toast.error('Erreur lors du rejet')
    } finally {
      setIsPending(false)
    }
  }

  const removeActiveMail = () => {
    const updated = mails.filter((_, idx) => idx !== selectedIdx)
    setMails(updated)
    setShowDiff(false)
    // Adjust index if necessary
    if (selectedIdx >= updated.length && updated.length > 0) {
      setSelectedIdx(updated.length - 1)
    }
  }

  // Generate date string
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Render text Diff
  const renderDiff = (oldText: string, newText: string) => {
    const diff = diffWords(oldText, newText)
    return (
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          padding: '1.25rem', 
          borderRadius: '8px', 
          border: '1px solid #cbd5e1', 
          fontSize: '0.925rem', 
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Georgia, serif',
          textAlign: 'justify'
        }}
      >
        {diff.map((change: DiffChange, idx: number) => {
          if (change.type === 'added') {
            return (
              <span key={idx} style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.1rem 0.2rem', borderRadius: '2px', fontWeight: 600 }}>
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/mails" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Retour aux courriers
          </Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} color="var(--primary)" /> Validation Express
          </h1>
        </div>
        <div style={{ padding: '0.5rem 1rem', backgroundColor: '#eff6ff', borderRadius: '9999px', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>
          {mails.length} courrier{mails.length > 1 ? 's' : ''} à valider
        </div>
      </div>

      {mails.length === 0 ? (
        <div 
          className="card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '350px',
            textAlign: 'center',
            padding: '3rem'
          }}
        >
          <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem', strokeWidth: 1.5 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tout est en ordre !</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Aucun courrier sortant n'est en attente de validation par le député pour le moment.
          </p>
          <Link href="/mails" className="button" style={{ marginTop: '1.5rem' }}>
            Aller aux courriers
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* List panel */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              maxHeight: 'calc(100vh - 200px)', 
              overflowY: 'auto',
              paddingRight: '0.25rem'
            }}
          >
            {mails.map((mail, idx) => (
              <div
                key={mail.id}
                onClick={() => {
                  setSelectedIdx(idx)
                  setShowRejectForm(false)
                  setShowDiff(false)
                }}
                className="card"
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  border: selectedIdx === idx ? '2px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: selectedIdx === idx ? '#f8fafc' : '#ffffff',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {mail.reference}
                  </span>
                  {mail.urgency === 'HAUTE' && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#fee2e2', color: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
                      URGENT
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                  {mail.subject}
                </h4>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {new Date(mail.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  {mail.assignee && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={12} /> {mail.assignee.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Review panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {activeMail && (
              <>
                {/* Paper sheet mockup */}
                <div 
                  className="card"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '3rem',
                    minHeight: '550px',
                    fontFamily: 'Georgia, serif',
                    color: '#1e293b',
                    lineHeight: '1.6'
                  }}
                >
                  {/* Letterhead */}
                  <div style={{ textAlign: 'center', marginBottom: '2.5rem', borderBottom: '2px double #cbd5e1', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0f172a', fontWeight: 'bold', fontFamily: 'system-ui, sans-serif' }}>
                      Assemblée nationale
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#1e3a8a', marginTop: '0.25rem' }}>
                      Lionel TIVOLI
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>
                      Député des Alpes-Maritimes
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ textAlign: 'right', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Nice, le {dateStr}
                  </div>

                  {/* Recipient */}
                  <div style={{ marginLeft: 'auto', width: '55%', marginBottom: '2.5rem', fontSize: '0.9rem', fontFamily: 'system-ui, sans-serif', padding: '0.5rem', borderLeft: '3px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Destinataire</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{activeMail.recipientName || '(Destinataire non renseigné)'}</div>
                    {activeMail.city && <div style={{ color: '#475569' }}>{activeMail.city}</div>}
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: '2rem', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'system-ui, sans-serif' }}>
                    Objet : <span style={{ fontWeight: 500 }}>{activeMail.subject}</span>
                  </div>

                  {/* Diff Toolbar */}
                  {activeMail.versions && activeMail.versions.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} className="no-print">
                      <button 
                        type="button" 
                        onClick={() => setShowDiff(!showDiff)} 
                        className="button outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        {showDiff ? 'Masquer modifications' : 'Voir modifications'}
                      </button>
                    </div>
                  )}

                  {/* Content (Diff or Normal) */}
                  {showDiff && activeMail.versions && activeMail.versions[0] ? (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'system-ui, sans-serif' }} className="no-print">
                        Modifications par rapport à la version rédigée par {activeMail.versions[0].editedBy.firstName} :
                      </p>
                      {renderDiff(activeMail.versions[0].content || '', activeMail.content || '')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', minHeight: '180px', color: '#334155', textAlign: 'justify' }}>
                      {activeMail.content || 'Aucun contenu de texte saisi.'}
                    </div>
                  )}

                  {/* Signature block placeholder */}
                  <div style={{ marginLeft: 'auto', width: '45%', marginTop: '3rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Lionel TIVOLI
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Député
                    </div>
                  </div>
                </div>

                {/* Validation Actions Panel */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  {showRejectForm ? (
                    <form onSubmit={handleRejectSubmit}>
                      <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        <XCircle size={18} /> Demander des corrections
                      </h4>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="reason" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Indiquez les corrections demandées au collaborateur :
                        </label>
                        <textarea
                          id="reason"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          placeholder="Ex: Corriger l'orthographe du nom du destinataire, ajouter le montant de la subvention..."
                          className="form-control"
                          rows={3}
                          required
                          style={{ resize: 'none', fontSize: '0.875rem', marginTop: '0.25rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectForm(false)
                            setRejectionReason('')
                          }}
                          className="button outline"
                          disabled={isPending}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="button"
                          disabled={isPending}
                          style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          <Send size={14} /> Envoyer le rejet
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Collaborateur en charge : <strong>{activeMail.assignee?.name || 'Non assigné'}</strong>
                      </div>
                      
                      {isAdmin ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={() => setShowRejectForm(true)}
                            disabled={isPending}
                            className="button outline"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <XCircle size={16} /> Rejeter / Corriger
                          </button>
                          
                          <button
                            onClick={handleValidate}
                            disabled={isPending}
                            className="button"
                            style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <CheckCircle size={16} /> Approuver (Signer)
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#854d0e', backgroundColor: '#fef9c3', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <AlertCircle size={16} />
                          <span>Seuls les Administrateurs (le député) peuvent valider ce courrier.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
