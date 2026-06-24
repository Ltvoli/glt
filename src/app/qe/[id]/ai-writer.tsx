'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateQeContentAction } from '../actions'
import { toast } from 'sonner'

interface QeAiWriterProps {
  qeId: string
  hasContent: boolean
}

export default function QeAiWriter({ qeId, hasContent }: QeAiWriterProps) {
  const [isPending, startTransition] = useTransition()
  const [customInstruction, setCustomInstruction] = useState('')

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await generateQeContentAction(qeId, customInstruction)
        if ('error' in res && res.error) {
          toast.error(res.error)
        } else {
          toast.success("Question rédigée avec succès par l'IA !")
          setCustomInstruction('')
        }
      } catch (err: any) {
        toast.error("Erreur technique : " + err.message)
      }
    })
  }

  return (
    <div className="card" style={{ 
      border: '1px solid var(--border)', 
      borderRadius: '12px', 
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
      position: 'relative'
    }}>
      {/* Premium glowing accent border */}
      <div style={{ 
        height: '4px', 
        background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #c7d2fe 100%)' 
      }} />

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5', marginBottom: '1rem' }}>
          <Sparkles size={20} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: 'var(--foreground)' }}>
            Rédacteur de Question Écrite
          </h3>
        </div>

        {isPending && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            zIndex: 10, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem',
            backdropFilter: 'blur(2px)'
          }}>
            <Loader2 size={36} className="animate-spin" style={{ color: '#4f46e5', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.95rem', textAlign: 'center' }}>
              Gemini rédige votre question...
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'center' }}>
              Analyse du contexte et rédaction législative en cours
            </p>
          </div>
        )}

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
          L'IA analyse le sujet de la question et vos notes pour rédiger un texte officiel rigoureux destiné au Journal Officiel.
        </p>

        {hasContent && (
          <div style={{ 
            backgroundColor: '#fff7ed', 
            border: '1px solid #ffedd5', 
            borderRadius: '8px', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            fontSize: '0.75rem', 
            color: '#c2410c',
            lineHeight: 1.4
          }}>
            ⚠️ La question possède déjà un texte. La génération par l'IA écrasera le texte existant.
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="qe-instruction" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
            Consignes particulières de rédaction (facultatif)
          </label>
          <textarea
            id="qe-instruction"
            className="form-control"
            placeholder="Ex: 'Insister sur l'impact budgétaire pour les petites communes des Alpes-Maritimes', 'Demander des aides urgentes pour la filière'..."
            rows={3}
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            style={{ resize: 'vertical', fontSize: '0.8rem' }}
            disabled={isPending}
          />
        </div>

        <button
          onClick={handleGenerate}
          className="button"
          style={{ 
            width: '100%', 
            gap: '0.5rem',
            backgroundColor: '#4f46e5'
          }}
          disabled={isPending}
        >
          <Sparkles size={16} />
          {hasContent ? "Régénérer la question" : "Rédiger la question"}
        </button>
      </div>
    </div>
  )
}
