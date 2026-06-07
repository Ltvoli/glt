'use client'

import { useTransition } from 'react'
import { requestManualBackup } from './export-actions'
import { DownloadCloud } from 'lucide-react'

export default function ExportButton() {
  const [isPending, startTransition] = useTransition()

  const handleBackup = () => {
    startTransition(async () => {
      const result = await requestManualBackup()
      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <button onClick={handleBackup} disabled={isPending} className="button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <DownloadCloud size={18} />
      {isPending ? 'Génération en cours...' : 'Générer une sauvegarde de la base'}
    </button>
  )
}
