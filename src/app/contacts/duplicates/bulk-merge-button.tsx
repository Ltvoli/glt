'use client'

import { useTransition } from 'react'
import { bulkMergeExactDuplicates } from './actions'
import { toast } from 'sonner'
import { Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BulkMergeButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleMerge = () => {
    if (!confirm("Êtes-vous sûr de vouloir fusionner automatiquement les doublons exacts ? Les contacts ayant les mêmes noms et prénoms seront combinés, leurs liaisons (courriers, tâches) seront regroupées, et les doublons vides seront archivés. Cette opération peut prendre quelques instants.")) {
      return
    }

    startTransition(async () => {
      const toastId = toast.loading("Fusion et nettoyage des doublons en cours...")
      try {
        const res = await bulkMergeExactDuplicates()
        if (res.error) {
          toast.error(res.error, { id: toastId })
        } else if (res.success) {
          toast.success(`${res.count} doublon(s) fusionné(s) et archivé(s) avec succès !`, { id: toastId })
          router.refresh()
        }
      } catch (err) {
        toast.error("Erreur lors de la fusion automatique.", { id: toastId })
      }
    })
  }

  return (
    <>
      <button
        onClick={handleMerge}
        disabled={isPending}
        className="button danger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          padding: '0.6rem 1.2rem',
          borderRadius: '6px',
          fontWeight: '600',
          cursor: isPending ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
          transition: 'all 0.2s'
        }}
      >
        <Flame size={16} className={isPending ? 'animate-spin-custom' : ''} />
        {isPending ? 'Fusion en cours (Batch)...' : '⚡ Fusionner automatiquement les doublons exacts'}
      </button>
    </>
  )
}
