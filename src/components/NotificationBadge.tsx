'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function NotificationBadge({ initialCount, isActive = false }: { initialCount: number, isActive?: boolean }) {
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
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <Link
        href="/notifications"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
          color: isActive ? 'white' : '#94a3b8',
          textDecoration: 'none',
          position: 'relative',
          transition: 'all 0.2s ease',
          fontWeight: isActive ? 600 : 400,
        }}
        onMouseOver={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'
            e.currentTarget.style.color = '#e2e8f0'
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = isActive ? 'var(--sidebar-active)' : 'transparent'
          e.currentTarget.style.color = isActive ? 'white' : '#94a3b8'
        }}
      >
        <Bell size={18} />
        Notifications
        {count > 0 && (
          <span className="animate-pulse-ring" style={{
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
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </>
  )
}
