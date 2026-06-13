'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveDeputyRemarks } from '../actions'
import { MessageSquare, Save } from 'lucide-react'

type DeputyRemarksWidgetProps = {
  permanenceId: string
  initialRemarks: string
  isReadOnly: boolean
}

export default function DeputyRemarksWidget({ permanenceId, initialRemarks, isReadOnly }: DeputyRemarksWidgetProps) {
  const router = useRouter()
  const [remarks, setRemarks] = useState(initialRemarks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (isReadOnly) return
    setSaving(true)
    setSaved(false)
    await saveDeputyRemarks(permanenceId, remarks)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)' }}>Remarques générales</h3>
        {saved && (
          <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
            ✓ Sauvegardé
          </span>
        )}
      </div>
      <textarea
        value={remarks}
        disabled={isReadOnly}
        onChange={e => { setRemarks(e.target.value); setSaved(false) }}
        rows={3}
        className="form-control"
        placeholder="Observations générales, points à retenir, consignes pour la prochaine permanence..."
        style={{ marginBottom: '0.75rem' }}
      />
      {!isReadOnly && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="button outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '36px' }}
        >
          <Save size={15} />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les remarques'}
        </button>
      )}
    </div>
  )
}
