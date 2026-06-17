'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateQE } from '../../actions'
import { renderQeField } from '../../dynamic-qe-fields'

const MINISTRIES = [
  "Premier ministre",
  "Ministère de l'Économie, des Finances et de l'Industrie",
  "Ministère de l'Intérieur",
  "Ministère du Travail et de l'Emploi",
  "Ministère de la Transition écologique, de l'Énergie, du Climat et de la Prévention des risques",
  "Ministère de la Justice",
  "Ministère des Armées et des Anciens combattants",
  "Ministère du Partenariat avec les territoires et de la Décentralisation",
  "Ministère de l'Agriculture, de la Souveraineté alimentaire et de la Forêt",
  "Ministère de l'Éducation nationale",
  "Ministère de l'Enseignement supérieur et de la Recherche",
  "Ministère de la Culture",
  "Ministère de la Santé et de l'Accès aux soins",
  "Ministère des Solidarités, de l'Autonomie et de l'Égalité entre les femmes et les hommes",
  "Ministère du Logement et de la Rénovation urbaine",
  "Ministère des Sports, de la Jeunesse et de la Vie associative",
  "Ministère de l'Europe et des Affaires étrangères",
  "Ministère des Outre-mer",
  "Autre"
]

export default function EditQEForm({ qe, users, dictionary = [], fieldConfig = {} }: { qe: any, users: {id: string; name: string}[], dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError('')
    const res = await updateQE(qe.id, formData)
    if (res?.error) {
      setError(res.error)
      setIsPending(false)
    }
  }

  const infoFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Informations' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const trackingFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Suivi' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  return (
    <form action={handleSubmit}>
      {infoFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations principales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {infoFields.map((f: any) => renderQeField(f.key, f.label, qe, users, dictionary))}
          </div>
        </>
      )}

      {trackingFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Suivi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {trackingFields.map((f: any) => renderQeField(f.key, f.label, qe, users, dictionary))}
          </div>
        </>
      )}

      {/* Hidden fallbacks for required fields if they are not visible in config */}
      {!fieldConfig?.title?.isVisible && (
        <input type="hidden" name="title" value={qe.title || ''} />
      )}
      {!fieldConfig?.type?.isVisible && (
        <input type="hidden" name="type" value={qe.type || 'QE'} />
      )}
      {!fieldConfig?.ministry?.isVisible && (
        <input type="hidden" name="ministry" value={qe.ministry || 'Autre'} />
      )}

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button type="button" className="button outline" onClick={() => router.push(`/qe/${qe.id}`)}>
          Annuler
        </button>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Mettre à jour la question'}
        </button>
      </div>
    </form>
  )
}
