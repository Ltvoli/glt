import React, { useEffect, useRef, useState } from 'react'

const QuillEditor = ({ defaultValue, onChange }: { defaultValue: string, onChange: (val: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const quillRef = useRef<any>(null)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const [value, setValue] = useState(defaultValue || '')

  const handleChange = (val: string) => {
    setValue(val)
    onChange(val)
  }

  useEffect(() => {
    let active = true

    const loadQuill = async () => {
      try {
        if (!document.getElementById('quill-css')) {
          const link = document.createElement('link')
          link.id = 'quill-css'
          link.rel = 'stylesheet'
          link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
          document.head.appendChild(link)
        }

        if (!(window as any).Quill) {
          if (!document.getElementById('quill-js')) {
            const script = document.createElement('script')
            script.id = 'quill-js'
            script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js'
            script.async = true
            document.head.appendChild(script)

            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Quill timeout')), 2000)
              script.onload = () => {
                clearTimeout(timeout)
                resolve()
              }
              script.onerror = (e) => {
                clearTimeout(timeout)
                reject(e)
              }
            })
          } else {
            let elapsed = 0
            while (!(window as any).Quill && active && elapsed < 2000) {
              await new Promise(r => setTimeout(r, 100))
              elapsed += 100
            }
          }
        }

        if (active && (window as any).Quill) {
          setQuillLoaded(true)
        }
      } catch (err) {
        console.warn("Quill indisponible, utilisation du champ texte standard:", err)
      }
    }

    loadQuill()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!quillLoaded || !containerRef.current || quillRef.current) return

    const Quill = (window as any).Quill
    if (!Quill) return

    try {
      containerRef.current.innerHTML = ''
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
      if (value) {
        quillInstance.root.innerHTML = value
      }

      quillInstance.on('text-change', () => {
        const html = quillInstance.root.innerHTML
        setValue(html)
        onChange(html)
      })
    } catch (e) {
      console.error("Erreur d'initialisation de Quill:", e)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      quillRef.current = null
    }
  }, [quillLoaded])

  return (
    <div style={{ position: 'relative', minHeight: '200px' }}>
      {!quillLoaded ? (
        <textarea
          ref={textareaRef}
          className="form-control"
          rows={8}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Saisissez ou collez le contenu du courrier..."
          style={{ width: '100%', minHeight: '220px', fontFamily: 'inherit', fontSize: '0.95rem' }}
        />
      ) : (
        <div 
          ref={containerRef} 
          style={{ 
            minHeight: '220px', 
            backgroundColor: '#fff', 
            borderRadius: '4px', 
            border: '1px solid var(--border)'
          }} 
        />
      )}
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
          <QuillEditorWrapper defaultValue={mail.content || ''} />
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
