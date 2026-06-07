'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Dans l'idéal, logger sur un service externe (Sentry, etc.)
    console.error('Erreur globale interceptée:', error)
  }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem' }}>
      <div style={{ maxWidth: '500px', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '1rem' }}>Oups ! Un problème est survenu.</h2>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
          Une erreur inattendue s'est produite. L'incident a été automatiquement signalé à nos équipes.<br/><br/>
          <strong>Détails:</strong> {error.message}
        </p>
        
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
            Code d'erreur : {error.digest}
          </p>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Réessayer
          </button>
          <a
            href="/"
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#e2e8f0', color: '#1e293b', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  )
}
