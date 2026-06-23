'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { validateMail, rejectMail } from '../actions'
import { toast } from 'sonner'

export default function MailValidationActions({ mailId }: { mailId: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleValidate = async () => {
    setIsPending(true)
    try {
      const res = await validateMail(mailId)
      if (res.error) toast.error(res.error)
      else toast.success('Courrier validé avec succès')
    } catch (e) {
      toast.error('Erreur lors de la validation')
    }
    setIsPending(false)
  }

  const handleReject = async () => {
    const reason = prompt('Motif du rejet (optionnel) :')
    if (reason === null) return // Annulé
    setIsPending(true)
    try {
      const res = await rejectMail(mailId, reason)
      if (res.error) toast.error(res.error)
      else toast.success('Courrier rejeté')
    } catch (e) {
      toast.error('Erreur lors du rejet')
    }
    setIsPending(false)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button 
        onClick={handleValidate} 
        disabled={isPending}
        className="button"
        style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <CheckCircle size={16} /> Approuver
      </button>
      <button 
        onClick={handleReject} 
        disabled={isPending}
        className="button outline"
        style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <XCircle size={16} /> Rejeter
      </button>
    </div>
  )
}
