'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateQE } from '../../actions'

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

export default function EditQEForm({ qe, users }: { qe: any, users: {id: string; name: string}[] }) {
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

  return (
    <form action={handleSubmit}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations principales</h3>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="title">Titre de la question *</label>
        <input type="text" id="title" name="title" className="form-control" required defaultValue={qe.title} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="type">Type de question *</label>
          <select id="type" name="type" className="form-control" required defaultValue={qe.type}>
            <option value="QE">Question Écrite (QE)</option>
            <option value="QAG">Question d&apos;Actualité au Gouvernement (QAG)</option>
            <option value="QOSD">Question Orale Sans Débat (QOSD)</option>
            <option value="AMENDEMENT">Amendement</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ministry">Ministère interrogé</label>
          <select id="ministry" name="ministry" className="form-control" defaultValue={qe.ministry || ''}>
            <option value="">Sélectionner un ministère</option>
            {MINISTRIES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="anNumber">Numéro AN</label>
          <input type="text" id="anNumber" name="anNumber" className="form-control" defaultValue={qe.anNumber || ''} />
        </div>
        <div className="form-group">
          <label htmlFor="theme">Thématique</label>
          <select id="theme" name="theme" className="form-control" defaultValue={qe.theme || ''}>
            <option value="">Sélectionner un thème</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Environnement">Environnement</option>
            <option value="Sécurité">Sécurité</option>
            <option value="Logement">Logement</option>
            <option value="Transports">Transports</option>
            <option value="Santé">Santé</option>
            <option value="Éducation">Éducation</option>
            <option value="Économie">Économie</option>
            <option value="Associations">Associations</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="assigneeId">Collaborateur en charge</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={qe.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="followUpDescription">Retour à faire (Optionnel)</label>
          <input type="text" id="followUpDescription" name="followUpDescription" className="form-control" defaultValue={qe.followUpDescription || ''} />
        </div>
        <div className="form-group">
          <label htmlFor="followUpDueDate">Échéance du retour</label>
          <input type="date" id="followUpDueDate" name="followUpDueDate" className="form-control" defaultValue={qe.followUpDueDate ? new Date(qe.followUpDueDate).toISOString().split('T')[0] : ''} />
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Contenu</h3>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="content">Texte de la question</label>
        <textarea id="content" name="content" className="form-control" rows={10} defaultValue={qe.content || ''}></textarea>
      </div>

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="notes">Notes internes (Non publiées)</label>
        <textarea id="notes" name="notes" className="form-control" rows={3} defaultValue={qe.notes || ''}></textarea>
      </div>

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
