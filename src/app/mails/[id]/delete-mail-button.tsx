'use client'

import { deleteMailAction } from '../actions'
import { useTransition } from 'react'

export default function DeleteMailButton({ mailId }: { mailId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm("Voulez-vous vraiment supprimer ce courrier ? Cette action est irréversible.")) {
      startTransition(async () => {
        const formData = new FormData()
        formData.append('mailId', mailId)
        await deleteMailAction(formData)
      })
    }
  }

  return (
    <form onSubmit={handleDelete}>
      <button 
        type="submit" 
        disabled={isPending}
        className="button outline" 
        style={{ 
          borderColor: 'var(--danger)', 
          color: 'var(--danger)',
          opacity: isPending ? 0.6 : 1,
          cursor: isPending ? 'not-allowed' : 'pointer'
        }}
      >
        {isPending ? 'Suppression...' : 'Supprimer'}
      </button>
    </form>
  )
}
