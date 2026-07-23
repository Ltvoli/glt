'use client'

import { useState, useEffect } from 'react'
import { FileCode, X, Sparkles, Loader2, Check } from 'lucide-react'
import { getDocumentTemplates, generateDocumentFromTemplate } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DocumentTemplateGenerateModalProps {
  folders?: any[]
  defaultFolderId?: string | null
}

export default function DocumentTemplateGenerateModal({ folders = [], defaultFolderId }: DocumentTemplateGenerateModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState(defaultFolderId || '')
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      setIsLoadingTemplates(true)
      getDocumentTemplates()
        .then(data => {
          setTemplates(data)
          if (data.length > 0) {
            setSelectedTemplateId(data[0].id)
            setTitle(`Document - ${data[0].name}`)
          }
        })
        .catch(() => toast.error("Erreur lors du chargement des modèles"))
        .finally(() => setIsLoadingTemplates(false))
    }
  }, [isOpen])

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedTemplateId(id)
    const tmpl = templates.find(t => t.id === id)
    if (tmpl) {
      setTitle(`Document - ${tmpl.name}`)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId || !title.trim()) {
      toast.error("Veuillez choisir un modèle et renseigner un titre")
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading("Génération du document à partir du modèle...")
    try {
      await generateDocumentFromTemplate(selectedTemplateId, title.trim(), folderId || undefined)
      toast.success("Document généré avec succès !", { id: toastId })
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="button outline"
        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: '#8b5cf6', color: '#7c3aed', fontWeight: 600 }}
      >
        <Sparkles size={18} />
        Générer depuis un modèle
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '550px',
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#f3e8ff', borderRadius: '8px', color: '#7c3aed' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Générateur de Modèle</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Créer un document pré-rempli à partir d'un template
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGenerate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  Modèle de document *
                </label>
                {isLoadingTemplates ? (
                  <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Chargement des modèles...</div>
                ) : templates.length === 0 ? (
                  <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '0.85rem' }}>
                    Aucun modèle configuré. Vous pouvez créer des modèles dans Admin &gt; Modèles.
                  </div>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={handleTemplateChange}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.entityType})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  Titre du document généré *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="Titre du nouveau document..."
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                  Dossier de destination
                </label>
                <select
                  value={folderId}
                  onChange={e => setFolderId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
                >
                  <option value="">(Aucun dossier / Racine)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="button outline">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !selectedTemplateId}
                  className="button primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Générer le document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
