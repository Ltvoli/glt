'use client'

import { useState } from 'react'
import { processImport } from './actions'
import { useRouter } from 'next/navigation'

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [forceConsent, setForceConsent] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Veuillez sélectionner un fichier CSV ou Excel.')
      return
    }

    setIsUploading(true)
    setError('')
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)
    if (forceConsent) formData.append('forceConsent', 'true')

    try {
      const response = await processImport(formData)
      if (response.error) {
        setError(response.error)
      } else {
        setResults(response)
      }
    } catch (err) {
      setError("Une erreur s'est produite lors de l'importation.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      {!results ? (
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="file" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Fichier Excel ou CSV Qomon
            </label>
            <input 
              type="file" 
              id="file" 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileChange}
              className="form-control"
              style={{ padding: '0.5rem' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="forceConsent" 
              checked={forceConsent}
              onChange={(e) => setForceConsent(e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
            <label htmlFor="forceConsent" style={{ fontWeight: 500, margin: 0, cursor: 'pointer' }}>
              Forcer le consentement (ex: import de liste d'adhérents)
            </label>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Si coché, tous les contacts de ce fichier seront marqués comme ayant accepté de recevoir des communications, 
            indépendamment de la valeur dans la colonne "Newsletter" du fichier.
          </p>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button type="submit" className="button" disabled={isUploading || !file}>
              {isUploading ? 'Analyse et importation...' : 'Lancer l\'importation'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#166534', marginBottom: '1rem' }}>
            Importation terminée
          </h3>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: '#15803d', marginBottom: '1.5rem' }}>
            <li>Contacts créés : <strong>{results.created}</strong></li>
            <li>Doublons détectés (mis en attente) : <strong>{results.duplicates}</strong></li>
            <li>Erreurs de format : <strong>{results.errors}</strong></li>
          </ul>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => router.push('/contacts')} className="button">
              Retour aux contacts
            </button>
            <button onClick={() => router.push('/contacts/duplicates')} className="button outline">
              Voir les doublons
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
