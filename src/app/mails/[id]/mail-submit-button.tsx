'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { submitMailForValidation } from '../actions'
import { toast } from 'sonner'

export default function MailSubmitButton({ 
  mailId, 
  users 
}: { 
  mailId: string
  users: { id: string; name: string }[] 
}) {
  const [isPending, setIsPending] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '')

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un destinataire pour la validation")
      return
    }
    setIsPending(true)
    try {
      const res = await submitMailForValidation(mailId, selectedUserId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Courrier soumis pour validation avec succès ! Tâche créée automatiquement.')
      }
    } catch (e) {
      toast.error('Erreur lors de la soumission')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Destinataire de la validation</label>
        <select
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white'
          }}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <button 
        onClick={handleSubmit} 
        disabled={isPending}
        className="button"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end' }}
      >
        <Send size={16} /> Soumettre pour validation
      </button>
    </div>
  )
}
