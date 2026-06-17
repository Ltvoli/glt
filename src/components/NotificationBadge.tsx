'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function NotificationBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    // Rafraîchit le compteur toutes les 60 secondes
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/notifications/count')
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
        }
      } catch {
        // Silencieux si pas de réseau
      }
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Link
      href="/notifications"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1rem',
        borderRadius: '8px',
        color: '#94a3b8',
        textDecoration: 'none',
        position: 'relative',
        transition: 'all 0.2s ease',
        fontWeight: 400,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'
        e.currentTarget.style.color = '#e2e8f0'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = '#94a3b8'
      }}
    >
      <Bell size={18} />
      Notifications
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: '6px',
          left: '24px',
          backgroundColor: '#ef4444',
          color: 'white',
          borderRadius: '9999px',
          fontSize: '0.65rem',
          fontWeight: 700,
          minWidth: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 3px',
          lineHeight: 1,
          animation: count > 0 ? 'pulse 2s infinite' : 'none',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
