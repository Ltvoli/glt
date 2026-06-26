'use client'

import { useState } from 'react'
import { addTaskComment } from './actions'
import { Send } from 'lucide-react'

export default function TaskComments({ taskId, initialComments }: { taskId: string, initialComments: any[] }) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSending(true)
    const res = await addTaskComment(taskId, content)
    if (res.success) {
      setContent('')
    }
    setIsSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '500px' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {initialComments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
            Aucun commentaire.
          </p>
        ) : (
          initialComments.map(comment => (
            <div key={comment.id} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <span>Par {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Système'}</span>
                <span>{new Date(comment.createdAt).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ajouter un commentaire..." 
          className="form-control"
          rows={2}
          style={{ flex: 1, resize: 'none' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
        />
        <button type="submit" className="button" disabled={isSending || !content.trim()} style={{ alignSelf: 'flex-end' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
