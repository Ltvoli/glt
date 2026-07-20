'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Mail, CheckSquare, HelpCircle, X } from 'lucide-react'

type SearchResults = {
  contacts: any[]
  tasks: any[]
  mails: any[]
  qe: any[]
}

export default function Omnisearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ contacts: [], tasks: [], mails: [], qe: [] })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setTimeout(() => {
        setQuery('')
        setResults({ contacts: [], tasks: [], mails: [], qe: [] })
      }, 0)
    }
  }, [isOpen])

  useEffect(() => {
    if (query.trim().length < 2) {
      setTimeout(() => {
        setResults({ contacts: [], tasks: [], mails: [], qe: [] })
      }, 0)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (err) {
        console.error('Search error', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  if (!isOpen) return null

  const closeAndNavigate = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const hasResults =
    results.contacts.length > 0 ||
    results.tasks.length > 0 ||
    results.mails.length > 0 ||
    results.qe.length > 0

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh'
    }}>
      <div style={{
        background: 'white', width: '100%', maxWidth: '600px', borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <Search size={20} color="#64748b" style={{ marginRight: '0.75rem' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher des contacts, courriers, tâches... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '1.125rem', color: '#0f172a'
            }}
          />
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem', background: '#f8fafc' }}>
          {query.trim().length >= 2 && !isLoading && !hasResults && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Aucun résultat trouvé pour "{query}"</div>
          )}
          
          {isLoading && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Recherche en cours...</div>
          )}

          {!isLoading && hasResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {results.contacts.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} /> Contacts
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {results.contacts.map((c) => (
                      <div key={c.id} onClick={() => closeAndNavigate(`/contacts/${c.id}`)}
                        style={{ padding: '0.75rem', background: 'white', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>
                          {c.firstName} {c.lastName}
                          {c.usageName && <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginLeft: '0.35rem' }}>(Nom d&apos;usage : {c.usageName})</span>}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{c.city}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.mails.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} /> Courriers
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {results.mails.map((m) => (
                      <div key={m.id} onClick={() => closeAndNavigate(`/mails/${m.id}`)}
                        style={{ padding: '0.75rem', background: 'white', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>{m.subject}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.reference}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={14} /> Tâches
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {results.tasks.map((t) => (
                      <div key={t.id} onClick={() => closeAndNavigate(`/tasks/${t.id}`)}
                        style={{ padding: '0.75rem', background: 'white', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>{t.title}</span>
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: t.priority === 'HAUTE' ? '#fee2e2' : '#f1f5f9', color: t.priority === 'HAUTE' ? '#ef4444' : '#475569', borderRadius: '4px' }}>
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.qe.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HelpCircle size={14} /> Questions Écrites
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {results.qe.map((q) => (
                      <div key={q.id} onClick={() => closeAndNavigate(`/qe/${q.id}`)}
                        style={{ padding: '0.75rem', background: 'white', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>{q.title}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.anNumber} - {q.ministry}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {query.trim().length < 2 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0', fontSize: '0.875rem' }}>
              Commencez à taper (au moins 2 caractères) pour rechercher partout.
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '0.75rem 1rem', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>Utilisez <b>Esc</b> pour fermer</span>
          <span><b>Cmd+K</b> ou <b>Ctrl+K</b> pour ouvrir</span>
        </div>
      </div>
    </div>
  )
}
