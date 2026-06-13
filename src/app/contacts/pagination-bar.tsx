'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  currentParams: Record<string, string | undefined>
  itemsPerPage: number
}

function buildUrl(params: Record<string, string | undefined>, newPage: number, newPerPage?: number) {
  const p = new URLSearchParams()
  const keys = ['city', 'nameQ', 'phone', 'streetQ', 'q', 'sector', 'tag',
    'lastInteraction', 'supportLevel', 'meetingStep', 'emailStatus', 'phoneStatus',
    'gender', 'addressStatus']
  for (const key of keys) {
    if (params[key]) p.set(key, params[key]!)
  }
  if (newPerPage) p.set('perPage', newPerPage.toString())
  else if (params.perPage) p.set('perPage', params.perPage)
  p.set('page', newPage.toString())
  return `/contacts?${p.toString()}`
}

// Generate page number list with ellipsis
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
}

export default function PaginationBar({ currentPage, totalPages, currentParams, itemsPerPage }: PaginationBarProps) {
  const router = useRouter()
  const pages = getPageNumbers(currentPage, totalPages)

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 6px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '0.83rem',
    color: '#374151',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 0.1s',
  }

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'var(--primary, #6366f1)',
    color: 'white',
    border: '1px solid var(--primary, #6366f1)',
    fontWeight: 700,
  }

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    cursor: 'not-allowed',
    color: '#d1d5db',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '1.5rem',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      {/* Left spacer */}
      <div style={{ width: '120px' }} />

      {/* Page numbers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Prev */}
        {currentPage > 1 ? (
          <a href={buildUrl(currentParams, currentPage - 1)} style={btnBase}>
            <ChevronLeft size={14} />
          </a>
        ) : (
          <span style={btnDisabled}><ChevronLeft size={14} /></span>
        )}

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.9rem' }}>
              ···
            </span>
          ) : (
            <a
              key={p}
              href={buildUrl(currentParams, p as number)}
              style={p === currentPage ? btnActive : btnBase}
            >
              {p}
            </a>
          )
        )}

        {/* Next */}
        {currentPage < totalPages ? (
          <a href={buildUrl(currentParams, currentPage + 1)} style={btnBase}>
            <ChevronRight size={14} />
          </a>
        ) : (
          <span style={btnDisabled}><ChevronRight size={14} /></span>
        )}
      </div>

      {/* Items per page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', color: '#64748b' }}>
        <select
          value={itemsPerPage}
          onChange={e => router.push(buildUrl(currentParams, 1, parseInt(e.target.value)))}
          style={{
            padding: '4px 28px 4px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            fontSize: '0.83rem',
            color: '#374151',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {[25, 50, 100, 200].map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </div>
    </div>
  )
}
