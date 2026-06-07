'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPermanence } from '../actions'

type CommuneData = {
  id: string
  name: string
  zipCode: string
}

export default function PermanenceForm({ communes }: { communes: CommuneData[] }) {
  const router = useRouter()
  const [selectedCommuneId, setSelectedCommuneId] = useState('')
  const [state, formAction, isPending] = useActionState(createPermanence, { success: false })

  useEffect(() => {
    if (state.success && state.data?.id) {
      router.push(`/permanences/${state.data.id}`)
    }
  }, [state, router])

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Titre de la permanence</label>
        <input 
          type="text" 
          name="title" 
          required 
          placeholder="Ex: Permanence Mobile - Nice Ouest" 
          className="form-control"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Date de la permanence</label>
          <input 
            type="date" 
            name="scheduledStartDate" 
            required 
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Commune</label>
          <select 
            name="communeId" 
            value={selectedCommuneId} 
            onChange={(e) => setSelectedCommuneId(e.target.value)} 
            className="form-control"
          >
            <option value="">-- Sélectionner dans le CRM --</option>
            {communes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.zipCode})</option>
            ))}
            <option value="FREE">-- Autre (Saisie libre) --</option>
          </select>
        </div>
      </div>

      {(!selectedCommuneId || selectedCommuneId === 'FREE') && (
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Nom de la commune libre</label>
          <input 
            type="text" 
            name="communeNameFree" 
            placeholder="Saisissez le nom de la commune..." 
            required={selectedCommuneId === 'FREE'}
            className="form-control"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Heure de début (optionnel)</label>
          <input 
            type="time" 
            name="startTime" 
            placeholder="09:00" 
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">Heure de fin (optionnel)</label>
          <input 
            type="time" 
            name="endTime" 
            placeholder="12:00" 
            className="form-control"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Adresse de rendez-vous</label>
        <input 
          type="text" 
          name="address" 
          placeholder="Ex: Place du Marché, devant la mairie" 
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="block text-sm font-semibold mb-1 text-gray-700">Notes ou instructions complémentaires</label>
        <textarea 
          name="notes" 
          rows={3} 
          placeholder="Détails logistiques, contacts presse, etc." 
          className="form-control"
          style={{ resize: 'vertical' }}
        ></textarea>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="button outline"
          style={{ flex: 1 }}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          disabled={isPending} 
          className="button"
          style={{ flex: 2 }}
        >
          {isPending ? 'Création...' : 'Créer la permanence'}
        </button>
      </div>
    </form>
  )
}
