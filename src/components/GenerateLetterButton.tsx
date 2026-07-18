'use client'

import React, { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { applyHtmlTemplateToMailAction } from '@/app/mails/actions'

type Template = { id: string, name: string, htmlContent?: string | null }

export default function GenerateLetterButton({ entityId, entityType, templates }: { entityId: string, entityType: string, templates: Template[] }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value
    if (!templateId) return

    const selectedTemplate = templates.find(t => t.id === templateId)
    if (!selectedTemplate) return

    setIsGenerating(true)
    try {
      // Si modèle HTML en ligne
      if (selectedTemplate.htmlContent !== undefined && selectedTemplate.htmlContent !== null) {
        const res = await applyHtmlTemplateToMailAction(entityId, templateId)
        if (res.error) {
          throw new Error(res.error)
        }
        toast.success('Modèle HTML appliqué avec succès !')
        window.location.reload()
      } else {
        // Modèle Word (DOCX) classique : compatibilité descendante
        const response = await fetch('/api/templates/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, entityId })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Erreur de génération')
        }

        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = 'lettre_generee.docx'
        if (contentDisposition && contentDisposition.includes('filename=')) {
          filename = contentDisposition.split('filename="')[1].split('"')[0]
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
        
        toast.success('Lettre générée avec succès !')
      }
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue')
    } finally {
      setIsGenerating(false)
      // Reset select
      e.target.value = ''
    }
  }

  if (templates.length === 0) return null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        <select 
          className="form-control" 
          onChange={handleGenerate} 
          disabled={isGenerating}
          style={{ padding: '0.5rem', width: '200px' }}
        >
          <option value="">Générer une réponse...</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
