'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function TopBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '0 0 2rem 0',
      marginBottom: '2rem',
      borderBottom: '1px solid var(--border)'
    }} className="hide-on-print">
      <form onSubmit={handleSearch} style={{ position: 'relative', width: '300px' }}>
        <input 
          type="text" 
          placeholder="Recherche globale..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-control"
          style={{ width: '100%', paddingLeft: '2.5rem', margin: 0, borderRadius: '20px' }}
        />
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </form>
    </div>
  )
}
