import React, { useEffect, useRef, useState } from 'react'

const QuillEditor = ({ defaultValue, onChange }: { defaultValue: string, onChange: (val: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadQuill = async () => {
      // 1. Ajouter le CSS si absent
      if (!document.getElementById('quill-css')) {
        const link = document.createElement('link')
        link.id = 'quill-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
        document.head.appendChild(link)
      }

      // 2. Charger le script JS si absent
      if (!(window as any).Quill) {
        if (!document.getElementById('quill-js')) {
          const script = document.createElement('script')
          script.id = 'quill-js'
          script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js'
          script.async = true
          document.head.appendChild(script)

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = (e) => reject(e)
          })
        } else {
          // Attendre que l'autre script termine de charger
          while (!(window as any).Quill && active) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      }

      if (!active) return
      setLoading(false)
    }

    loadQuill()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (loading || !containerRef.current || quillRef.current) return

    const Quill = (window as any).Quill
    if (!Quill) return

    const editorContainer = document.createElement('div')
    containerRef.current.appendChild(editorContainer)

    const quillInstance = new Quill(editorContainer, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean']
        ]
      }
    })

    quillRef.current = quillInstance

    if (defaultValue) {
      quillInstance.root.innerHTML = defaultValue
    }

    quillInstance.on('text-change', () => {
      onChange(quillInstance.root.innerHTML)
    })

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      quillRef.current = null
    }
  }, [loading])

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Chargement de l'éditeur Quill...
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          minHeight: '300px', 
          backgroundColor: '#fff', 
          borderRadius: '4px', 
          border: '1px solid var(--border)',
          display: loading ? 'none' : 'block'
        }} 
      />
    </div>
  )
}

const QuillEditorWrapper = ({ defaultValue }: { defaultValue: string }) => {
  const [value, setValue] = useState(defaultValue)
  return (
    <div>
      <QuillEditor defaultValue={defaultValue} onChange={setValue} />
      <input type="hidden" name="content" value={value} />
    </div>
  )
}

export function renderMailField(
  fieldKey: string,
  label: string,
  mail: any = {},
  users: any[] = [],
  mailType: string = 'ENTRANT',
  setMailType?: (val: string) => void,
  initialSubject?: string
) {
  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'type' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
          <div className="form-group">
            <label htmlFor="type">{label} *</label>
            <select
              id="type"
              name="type"
              className="form-control"
              value={mailType}
              onChange={e => setMailType && setMailType(e.target.value)}
            >
              <option value="ENTRANT">Entrant (Reçu)</option>
              <option value="SORTANT">Sortant (Envoyé)</option>
            </select>
          </div>
          {mailType === 'ENTRANT' ? (
            <div className="form-group">
              <label htmlFor="receiveDate">Date de réception *</label>
              <input
                type="date"
                id="receiveDate"
                name="receiveDate"
                className="form-control"
                required
                defaultValue={mail.receiveDate ? new Date(mail.receiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="sentDate">Date d'envoi *</label>
              <input
                type="date"
                id="sentDate"
                name="sentDate"
                className="form-control"
                required
                defaultValue={mail.sentDate ? new Date(mail.sentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      )}

      {fieldKey === 'subject' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="subject">{label} *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="form-control"
            defaultValue={mail.subject || initialSubject || ''}
            required
          />
        </div>
      )}

      {fieldKey === 'channel' && (
        <div className="form-group">
          <label htmlFor="channel">{label} *</label>
          <select id="channel" name="channel" className="form-control" required defaultValue={mail.channel || 'POSTAL'}>
            <option value="POSTAL">Postal</option>
            <option value="MAIL">Email</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
      )}

      {fieldKey === 'category' && (
        <div className="form-group">
          <label htmlFor="category">{label}</label>
          <select id="category" name="category" className="form-control" defaultValue={mail.category || ''}>
            <option value="">Non catégorisé</option>
            <option value="DEMANDE_INTERVENTION">Demande d'intervention</option>
            <option value="INVITATION">Invitation</option>
            <option value="INFORMATION">Information</option>
            <option value="RECLAMATION">Réclamation</option>
          </select>
        </div>
      )}

      {fieldKey === 'urgency' && (
        <div className="form-group">
          <label htmlFor="urgency">{label}</label>
          <select id="urgency" name="urgency" className="form-control" defaultValue={mail.urgency || 'NORMALE'}>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute / Urgent</option>
          </select>
        </div>
      )}

      {fieldKey === 'content' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="content">{label}</label>
          {mailType === 'SORTANT' ? (
            <QuillEditorWrapper defaultValue={mail.content || ''} />
          ) : (
            <textarea id="content" name="content" className="form-control" rows={8} defaultValue={mail.content || ''} placeholder="Collez le texte du courrier ici..." />
          )}
        </div>
      )}

      {fieldKey === 'notes' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="notes">{label}</label>
          <textarea id="notes" name="notes" className="form-control" rows={3} defaultValue={mail.notes || ''} placeholder="Informations complémentaires, contexte..." />
        </div>
      )}

      {fieldKey === 'senderName' && mailType === 'ENTRANT' && (
        <div className="form-group">
          <label htmlFor="senderName">{label}</label>
          <input
            type="text"
            id="senderName"
            name="senderName"
            className="form-control"
            defaultValue={mail.senderName || ''}
          />
        </div>
      )}

      {fieldKey === 'recipientName' && mailType === 'SORTANT' && (
        <div className="form-group">
          <label htmlFor="recipientName">{label}</label>
          <input
            type="text"
            id="recipientName"
            name="recipientName"
            className="form-control"
            defaultValue={mail.recipientName || ''}
          />
        </div>
      )}

      {fieldKey === 'city' && (
        <div className="form-group">
          <label htmlFor="city">{label}</label>
          <input
            type="text"
            id="city"
            name="city"
            className="form-control"
            defaultValue={mail.city || ''}
          />
        </div>
      )}

      {fieldKey === 'responseDueDate' && (
        <div className="form-group">
          <label htmlFor="responseDueDate">{label}</label>
          <input
            type="date"
            id="responseDueDate"
            name="responseDueDate"
            className="form-control"
            defaultValue={mail.responseDueDate ? new Date(mail.responseDueDate).toISOString().split('T')[0] : ''}
          />
        </div>
      )}

      {fieldKey === 'assigneeId' && (
        <div className="form-group">
          <label htmlFor="assigneeId">{label}</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={mail.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}
    </React.Fragment>
  )
}
