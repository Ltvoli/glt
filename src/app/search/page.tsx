'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CheckSquare, Mail, HelpCircle } from 'lucide-react'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState<{ contacts: any[], tasks: any[], mails: any[], qe: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length >= 2) {
      let active = true
      
      const fetchResults = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
          const data = await res.json()
          if (active) {
            setResults(data)
          }
        } finally {
          if (active) setLoading(false)
        }
      }
      
      fetchResults()
      
      return () => { active = false }
    }
  }, [q])

  if (!q || q.trim().length < 2) {
    return <div>Veuillez saisir au moins 2 caractères pour rechercher.</div>
  }

  if (loading) return <div>Recherche en cours...</div>
  if (!results) return null

  const hasResults = results.contacts.length > 0 || results.tasks.length > 0 || results.mails.length > 0 || results.qe.length > 0

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        Résultats pour "{q}"
      </h1>

      {!hasResults && (
        <p style={{ color: 'var(--text-muted)' }}>Aucun résultat trouvé dans la base.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {results.contacts.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> Contacts ({results.contacts.length})
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.contacts.map(c => (
                <li key={c.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <Link href={`/contacts/${c.id}`} style={{ fontWeight: 500, color: 'var(--primary)' }}>
                    {c.firstName} {c.lastName}
                  </Link>
                  <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c.city} - {c.email}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.tasks.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} /> Tâches ({results.tasks.length})
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.tasks.map(t => (
                <li key={t.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <Link href={`/tasks/${t.id}`} style={{ fontWeight: 500, color: 'var(--primary)' }}>
                    {t.title}
                  </Link>
                  <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Statut: {t.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.mails.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} /> Courriers ({results.mails.length})
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.mails.map(m => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <Link href={`/mails/${m.id}`} style={{ fontWeight: 500, color: 'var(--primary)' }}>
                    {m.reference} - {m.subject}
                  </Link>
                  <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Statut: {m.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.qe.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} /> Questions (QE) ({results.qe.length})
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.qe.map(qItem => (
                <li key={qItem.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <Link href={`/qe/${qItem.id}`} style={{ fontWeight: 500, color: 'var(--primary)' }}>
                    {qItem.anNumber ? `${qItem.anNumber} - ` : ''}{qItem.title}
                  </Link>
                  <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{qItem.ministry}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
