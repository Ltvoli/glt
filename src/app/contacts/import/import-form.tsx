'use client'

import { useState } from 'react'
import { processImport } from './actions'
import { useRouter } from 'next/navigation'

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null)
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
      setError('Veuillez sélectionner un fichier CSV.')
      return
    }

    setIsUploading(true)
    setError('')
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)

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
              Fichier CSV Qomon
            </label>
            <input 
              type="file" 
              id="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="form-control"
              style={{ padding: '0.5rem' }}
            />
          </div>

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
