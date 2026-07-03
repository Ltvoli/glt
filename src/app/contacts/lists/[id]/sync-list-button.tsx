'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { syncListToBrevo } from '../actions'
import { toast } from 'sonner'

export default function SyncListButton({ listId }: { listId: string }) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    const listIdInput = window.prompt("Saisissez l'identifiant (ID numérique) de la liste Brevo de destination (ex: 2) :")
    if (listIdInput === null) return

    const brevoListId = parseInt(listIdInput.trim(), 10)
    if (isNaN(brevoListId)) {
      toast.error("L'identifiant de la liste Brevo doit être un nombre entier valide.")
      return
    }

    setIsSyncing(true)
    try {
      const res = await syncListToBrevo(listId, brevoListId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Synchronisation terminée : ${res.syncedCount || 0} contact(s) mis à jour sur Brevo !`)
      }
    } catch (e) {
      toast.error("Erreur lors de la communication avec le serveur.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="button outline"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
    >
      <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Synchronisation..." : "Synchroniser vers Brevo"}
    </button>
  )
}
