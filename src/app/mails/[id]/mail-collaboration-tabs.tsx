'use client'

import { useState } from 'react'
import { FileText, MessageSquare, History, Send, ChevronRight } from 'lucide-react'
import { addMailComment } from '../actions'
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

export default function MailCollaborationTabs({ mail, currentUserId }: MailCollaborationTabsProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'comments' | 'history'>('preview')
  
  // Comments state
  const [commentsList, setCommentsList] = useState<Comment[]>(mail.comments)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Version diff state
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      const res = await addMailComment(mail.id, newComment)
      if (res.error) {
        toast.error(res.error)
      } else if (res.comment) {
        // cast to expected type
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

  // Generate date string
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

  // Render Diff inline
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
          onClick={() => setActiveTab('preview')}
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
          onClick={() => setActiveTab('comments')}
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
            onClick={() => setActiveTab('history')}
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
          <div 
            className="card"
            style={{ 
              backgroundColor: '#ffffff', 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '3.5rem',
              minHeight: '600px',
              fontFamily: 'Georgia, serif',
              color: '#1e293b',
              lineHeight: '1.6'
            }}
          >
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
          </div>
        </div>
      )/* preview */}

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
