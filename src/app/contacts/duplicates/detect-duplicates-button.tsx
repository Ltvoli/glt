'use client'

import { useTransition } from 'react'
import { triggerDuplicateDetection } from './actions'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

export default function DetectDuplicatesButton() {
  const [isPending, startTransition] = useTransition()

  const handleDetect = () => {
    startTransition(async () => {
      try {
        const res = await triggerDuplicateDetection()
        if (res.error) {
          toast.error(res.error)
        } else if (res.success) {
          toast.success(`${res.count} nouveau(x) doublon(s) potentiel(s) détecté(s) !`)
        }
      } catch (err) {
        toast.error('Erreur lors de la détection des doublons.')
      }
    })
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-custom {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <button
        onClick={handleDetect}
        disabled={isPending}
        className="button"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <RefreshCw size={16} className={isPending ? 'animate-spin-custom' : ''} />
        {isPending ? 'Détection en cours...' : 'Lancer la détection (Batch)'}
      </button>
    </>
  )
}
