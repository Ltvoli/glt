'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entityType, setEntityType] = useState('MAIL')
  const router = useRouter()

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name) {
      toast.error('Veuillez fournir un nom et un fichier DOCX')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    formData.append('description', description)
    formData.append('entityType', entityType)

    try {
      const res = await fetch('/api/templates/docs/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')

      toast.success('Modèle uploadé avec succès')
      setTemplates([data.template, ...templates])
      setFile(null)
      setName('')
      setDescription('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Formulaire d'upload */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Nouveau Modèle
          </h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Nom du modèle</label>
              <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Réponse Standard Préfet" required />
            </div>
            <div>
              <label className="form-label">Lié à :</label>
              <select className="form-control" value={entityType} onChange={e => setEntityType(e.target.value)}>
                <option value="MAIL">Courriers (MAIL)</option>
                <option value="CONTACT">Contacts (CONTACT)</option>
                <option value="QE">Questions Écrites (QE)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Description (optionnel)</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="form-label">Fichier Modèle (.docx)</label>
              <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} className="form-control" required />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Variables possibles : {`{prenom}`}, {`{nom}`}, {`{adresse}`}, {`{objet}`}, {`{reference}`}, {`{date}`}
              </p>
            </div>
            <button type="submit" className="button primary" disabled={isUploading || !file}>
              {isUploading ? 'Upload en cours...' : 'Ajouter le modèle'}
            </button>
          </form>
        </div>

        {/* Liste des modèles */}
        <div>
          <h3>Modèles existants ({templates.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {templates.length === 0 && <p className="text-muted">Aucun modèle pour le moment.</p>}
            {templates.map(t => (
              <div key={t.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#eff6ff', color: '#3b82f6', borderRadius: '8px' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>{t.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lié à : {t.entityType} | Fichier : {t.originalName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
