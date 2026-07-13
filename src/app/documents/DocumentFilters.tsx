'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DocumentFilters({ users }: { users: { id: string, name: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // We only need local state for the query input to allow smooth typing
  const [query, setQuery] = useState(searchParams.get('q') || '')

  // Sync query input value if URL changes externally
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`/documents?${params.toString()}`)
  }

  // Debounce query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (query !== currentQ) {
        updateUrl({ q: query })
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const type = searchParams.get('type') || ''
  const conf = searchParams.get('conf') || ''
  const author = searchParams.get('author') || ''
  const relation = searchParams.get('relation') || ''
  const status = searchParams.get('status') || ''

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <input 
        type="text" 
        placeholder="Rechercher par titre ou contenu..." 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: '1 1 250px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
      />
      
      <select value={type} onChange={(e) => updateUrl({ type: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="">Tous les types</option>
        <option value="PDF">PDF</option>
        <option value="WORD">Word</option>
        <option value="COURRIER">Courrier</option>
        <option value="QE">Question Écrite</option>
        <option value="NOTE">Note interne</option>
        <option value="AUTRE">Autre</option>
      </select>

      <select value={conf} onChange={(e) => updateUrl({ conf: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="">Toutes conf. (Défaut)</option>
        <option value="INTERNE">Interne</option>
        <option value="RESTREINT">Restreint</option>
        <option value="SENSIBLE">Sensible</option>
        <option value="CONFIDENTIEL">Confidentiel</option>
      </select>

      <select value={author} onChange={(e) => updateUrl({ author: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="">Tous les auteurs</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <select value={relation} onChange={(e) => updateUrl({ relation: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="">Toutes les origines</option>
        <option value="ORPHELIN">Documents volants</option>
        <option value="CONTACT">Liés à un contact</option>
        <option value="TASK">Liés à une tâche</option>
        <option value="MAIL">Liés à un courrier</option>
        <option value="QE">Liés à une QE</option>
      </select>

      <select value={status} onChange={(e) => updateUrl({ status: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="">Tous les statuts</option>
        <option value="VALIDATED">Validés</option>
        <option value="PENDING">En attente de validation</option>
        <option value="REJECTED">Rejetés</option>
        <option value="DRAFT">Brouillon</option>
      </select>

      {(query || type || conf || author || relation || status) && (
        <button 
          onClick={() => {
            setQuery('')
            updateUrl({ q: null, type: null, conf: null, author: null, relation: null, status: null })
          }}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Effacer
        </button>
      )}
    </div>
  )
}
