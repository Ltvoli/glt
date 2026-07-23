'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Code, Tag, Sparkles, CheckCircle2, Lock, Eye, X, Loader2 } from 'lucide-react'
import { createMailTemplate, updateMailTemplate, deleteMailTemplate } from './actions'
import { MAIL_VARIABLES_CATALOG } from '@/lib/mail-template-engine'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  FELICITATION: { label: 'Félicitations & Distinctions', color: '#16a34a', bg: '#dcfce7' },
  CITOYENNETE: { label: 'Sollicitations Citoyennes', color: '#2563eb', bg: '#dbeafe' },
  MINISTERIEL: { label: 'Interpellations Ministérielles', color: '#7c3aed', bg: '#f3e8ff' },
  INVITATION: { label: 'Invitations Officielles', color: '#d97706', bg: '#fef3c7' },
  SUBVENTION: { label: 'Soutien & Subventions', color: '#0891b2', bg: '#cffafe' },
  DIVERS: { label: 'Divers & Général', color: '#475569', bg: '#f1f5f9' },
}

export default function TemplateStudioClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState<any[]>(initialTemplates)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('CITOYENNETE')
  const [description, setDescription] = useState('')
  const [bodyStructure, setBodyStructure] = useState('')
  const [status, setStatus] = useState('PUBLIE')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  const openCreateModal = () => {
    setEditingTemplate(null)
    setName('')
    setCode('TMPL_NOUVEAU_' + Math.floor(Math.random() * 1000))
    setCategory('CITOYENNETE')
    setDescription('')
    setBodyStructure(`{{CONTACT_CIVILITE}} {{CONTACT_TITRE}},\n\n[Votre texte ici...]\n\nJe vous prie d'agréer, {{CONTACT_CIVILITE}}, l'expression de mes salutations distinguées.`)
    setStatus('PUBLIE')
    setIsModalOpen(true)
  }

  const openEditModal = (tmpl: any) => {
    setEditingTemplate(tmpl)
    setName(tmpl.name)
    setCode(tmpl.code)
    setCategory(tmpl.category)
    setDescription(tmpl.description || '')
    setBodyStructure(tmpl.bodyStructure || '')
    setStatus(tmpl.status)
    setIsModalOpen(true)
  }

  const handleInsertVariable = (varKey: string) => {
    setBodyStructure(prev => prev + ` {{${varKey}}}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !bodyStructure.trim()) {
      toast.error("Veuillez renseigner un nom et le contenu du modèle")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(editingTemplate ? "Mise à jour du modèle..." : "Création du modèle...")

    try {
      if (editingTemplate) {
        await updateMailTemplate(editingTemplate.id, {
          name, category, description, bodyStructure, status, incrementVersion: true
        })
        toast.success("Modèle mis à jour (Version incrémentée) !", { id: toastId })
      } else {
        await createMailTemplate({
          code, name, category, description, bodyStructure
        })
        toast.success("Nouveau modèle créé et publié avec succès !", { id: toastId })
      }
      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le modèle "${name}" ?`)) return
    try {
      await deleteMailTemplate(id)
      toast.success("Modèle supprimé")
      router.refresh()
    } catch (err) {
      toast.error("Erreur de suppression")
    }
  }

  const filteredTemplates = selectedCategory === 'ALL'
    ? templates
    : templates.filter(t => t.category === selectedCategory)

  return (
    <div>
      {/* Category Tabs & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className="button"
            style={{
              backgroundColor: selectedCategory === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: selectedCategory === 'ALL' ? '#fff' : '#475569',
              fontSize: '0.85rem', padding: '0.4rem 0.85rem'
            }}
          >
            Tous ({templates.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className="button"
              style={{
                backgroundColor: selectedCategory === key ? cat.color : '#f1f5f9',
                color: selectedCategory === key ? '#fff' : '#475569',
                fontSize: '0.85rem', padding: '0.4rem 0.85rem'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={openCreateModal}
          className="button primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
        >
          <Plus size={18} /> Nouveau Modèle
        </button>
      </div>

      {/* Grid of Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {filteredTemplates.map(tmpl => {
          const catInfo = CATEGORIES[tmpl.category] || CATEGORIES.DIVERS
          const vars = Array.isArray(tmpl.requiredVariables) ? tmpl.requiredVariables : []

          return (
            <div key={tmpl.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: catInfo.bg, color: catInfo.color
                  }}>
                    {catInfo.label}
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                    v{tmpl.version}.0
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.4rem 0', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                  {tmpl.name}
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4 }}>
                  {tmpl.description || 'Modèle officiel de correspondance parlementaire.'}
                </p>

                {/* Variables list */}
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Variables incluses ({vars.length}) :
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                    {vars.slice(0, 5).map((v: string) => (
                      <span key={v} style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', color: '#475569', fontFamily: 'monospace' }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {vars.length > 5 && (
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', color: '#94a3b8' }}>
                        +{vars.length - 5} autres
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Code: <code style={{ fontSize: '0.75rem' }}>{tmpl.code}</code>
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="button outline"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Edit2 size={14} /> Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Edit / Create */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '750px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>
                {editingTemplate ? `Éditer le Modèle v${editingTemplate.version}.0` : 'Nouveau Modèle Institutionnel'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Nom du modèle *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Catégorie *</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    {Object.entries(CATEGORIES).map(([k, cat]) => (
                      <option key={k} value={k}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Description métier</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectif et contexte d'utilisation..." style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>

              {/* Variable Quick-Insertion Buttons */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Insérer des variables dynamiques :
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {MAIL_VARIABLES_CATALOG.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      style={{
                        padding: '3px 8px', fontSize: '0.75rem', backgroundColor: '#fff', border: '1px solid #cbd5e1',
                        borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', color: '#1e293b'
                      }}
                      title={v.description}
                    >
                      + {v.key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Structure du corps du courrier (avec variables {"{{...}}"}) *
                </label>
                <textarea
                  value={bodyStructure}
                  onChange={e => setBodyStructure(e.target.value)}
                  rows={8}
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: '1.5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="button outline">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="button primary" style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {editingTemplate ? 'Enregistrer (v+1)' : 'Publier le modèle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
