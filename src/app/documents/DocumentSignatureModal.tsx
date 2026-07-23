'use client'

import { useState, useRef } from 'react'
import { FileSignature, X, CheckCircle, RotateCcw, Loader2, ShieldCheck } from 'lucide-react'
import { signDocument } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DocumentSignatureModalProps {
  doc: any
  isOpen: boolean
  onClose: () => void
}

export default function DocumentSignatureModal({ doc, isOpen, onClose }: DocumentSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  if (!isOpen || !doc) return null

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSign = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.error("Veuillez d'abord tracer votre signature ci-dessus")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Enregistrement de la signature certifiée...")
    try {
      const signatureData = canvas.toDataURL('image/png')
      await signDocument(doc.id, signatureData)
      toast.success("Document signé électroniquement avec succès !", { id: toastId })
      onClose()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la signature", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
            <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#b45309' }}>
              <FileSignature size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Signature Électronique</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {doc.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>Signature numériquement horodatée et rattachée à votre compte utilisateur.</span>
          </div>

          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.5rem' }}>
            Tracez votre signature ci-dessous :
          </label>

          <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '12px', backgroundColor: '#fff', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ width: '100%', height: '180px', cursor: 'crosshair', display: 'block', touchAction: 'none' }}
            />
            {!hasDrawn && (
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', fontSize: '0.875rem', pointerEvents: 'none' }}>
                Signez ici avec votre souris ou doigt
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawn}
              className="button outline"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RotateCcw size={14} /> Effacer
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="button outline">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSign}
                disabled={isSubmitting || !hasDrawn}
                className="button primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Valider la signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
