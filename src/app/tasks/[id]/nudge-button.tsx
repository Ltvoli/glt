'use client'

import { useTransition } from 'react'
import { nudgeAssigneeAction } from './actions'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'

export default function NudgeButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleNudge = () => {
    startTransition(async () => {
      try {
        const res = await nudgeAssigneeAction(taskId)
        if (res.error) {
          toast.error(res.error)
        } else if (res.success) {
          toast.success('Le responsable a été relancé avec succès !')
        }
      } catch (err) {
        toast.error('Erreur lors de la relance.')
      }
    })
  }

  return (
    <>
      <style>{`
        @keyframes bounce-custom {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-custom {
          animation: bounce-custom 0.6s ease infinite;
        }
      `}</style>
      <button
        onClick={handleNudge}
        disabled={isPending}
        className="button outline"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Bell size={16} className={isPending ? 'animate-bounce-custom' : ''} />
        {isPending ? 'Relance en cours...' : 'Relancer le responsable'}
      </button>
    </>
  )
}
