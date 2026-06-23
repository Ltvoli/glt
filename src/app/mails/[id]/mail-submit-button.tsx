'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { submitMailForValidation } from '../actions'
import { toast } from 'sonner'

export default function MailSubmitButton({ mailId }: { mailId: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    setIsPending(true)
    try {
      const res = await submitMailForValidation(mailId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Courrier soumis pour validation avec succès !')
      }
    } catch (e) {
      toast.error('Erreur lors de la soumission')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button 
      onClick={handleSubmit} 
      disabled={isPending}
      className="button"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <Send size={16} /> Soumettre pour validation
    </button>
  )
}
