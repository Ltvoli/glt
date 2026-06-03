'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { archiveContact } from '../actions'

export default function ArchiveButton({ contactId }: { contactId: string }) {
  const router = useRouter()

  const handleArchive = async () => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce contact ? Cette action masquera le contact des listes principales.')) {
      return
    }

    const result = await archiveContact(contactId)
    
    if (result.error) {
      alert(result.error)
    } else {
      router.push('/contacts')
      router.refresh()
    }
  }

  return (
    <button onClick={handleArchive} className="button outline danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Trash2 size={16} /> Archiver
    </button>
  )
}
