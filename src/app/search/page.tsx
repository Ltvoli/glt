'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { Users, CheckSquare, Mail, HelpCircle, Search, Loader2, Inbox } from 'lucide-react'

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState<{ contacts: any[]; tasks: any[]; mails: any[]; qe: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return }
    let active = true
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { if (active) setResults(data) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [q])

  if (!q || q.trim().length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
        <Search size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Tapez au moins 2 caractères pour rechercher</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Contacts, tâches, courriers, questions écrites…</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <p>Recherche en cours…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!results) return null

  const total = results.contacts.length + results.tasks.length + results.mails.length + results.qe.length

  const sections = [
    {
      key: 'contacts',
      label: 'Contacts',
      icon: Users,
      color: '#6366f1',
      bg: '#eef2ff',
      items: results.contacts,
      renderItem: (c: any) => ({
        href: `/contacts/${c.id}`,
        title: `${c.firstName} ${c.lastName}`,
        sub: [c.city, c.email, c.mobilePhone].filter(Boolean).join(' · '),
      }),
    },
    {
      key: 'tasks',
      label: 'Tâches',
      icon: CheckSquare,
      color: '#f59e0b',
      bg: '#fffbeb',
      items: results.tasks,
      renderItem: (t: any) => ({
        href: `/tasks/${t.id}`,
        title: t.title,
        sub: `Statut : ${t.status} · Priorité : ${t.priority || '—'}`,
      }),
    },
    {
      key: 'mails',
      label: 'Courriers',
      icon: Mail,
      color: '#10b981',
      bg: '#f0fdf4',
      items: results.mails,
      renderItem: (m: any) => ({
        href: `/mails/${m.id}`,
        title: m.subject,
        sub: `${m.reference ? m.reference + ' · ' : ''}Statut : ${m.status}`,
      }),
    },
    {
      key: 'qe',
      label: 'Questions écrites',
      icon: HelpCircle,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      items: results.qe,
      renderItem: (q: any) => ({
        href: `/qe/${q.id}`,
        title: q.anNumber ? `${q.anNumber} — ${q.title}` : q.title,
        sub: q.ministry || 'Ministère non précisé',
      }),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
        {total === 0
          ? 'Aucun résultat trouvé'
          : <><strong style={{ color: '#0f172a' }}>{total}</strong> résultat{total > 1 ? 's' : ''} pour « {q} »</>
        }
      </div>

      {total === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Inbox size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>Aucun résultat</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Essayez un autre terme de recherche</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sections.map(({ key, label, icon: Icon, color, bg, items, renderItem }) =>
            items.length > 0 ? (
              <section key={key} className="card" style={{ padding: '1.25rem' }}>
                <h2 style={{
                  fontSize: '0.85rem', fontWeight: 700,
                  marginBottom: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <span style={{ padding: '4px 6px', borderRadius: '6px', background: bg }}>
                    <Icon size={14} />
                  </span>
                  {label} ({items.length})
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map((item: any) => {
                    const { href, title, sub } = renderItem(item)
                    return (
                      <li key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <Link href={href} style={{
                          display: 'flex', flexDirection: 'column',
                          padding: '0.6rem 0.25rem',
                          textDecoration: 'none', color: 'inherit',
                          transition: 'background 0.1s',
                          borderRadius: '6px',
                        }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>{title}</span>
                          {sub && <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{sub}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null
          )}
        </div>
      )}
    </>
  )
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Recherche globale
        </h1>
        {q && (
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.9rem' }}>
            Résultats pour : <strong>« {q} »</strong>
          </p>
        )}
      </div>

      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <SearchResults />
      </Suspense>
    </div>
  )
}
