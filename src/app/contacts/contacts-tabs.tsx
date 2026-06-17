'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, List, MailOpen } from 'lucide-react'

export default function ContactsTabs() {
  const pathname = usePathname()

  const tabs = [
    { name: 'Tous les contacts', href: '/contacts', icon: Users },
    { name: 'Listes de diffusion', href: '/contacts/lists', icon: List },
    { name: 'Historique des envois', href: '/contacts/communications', icon: MailOpen },
  ]

  return (
    <div style={{ 
      display: 'flex', 
      gap: '0.5rem', 
      borderBottom: '1px solid var(--border)', 
      marginBottom: '1.5rem', 
      paddingBottom: '2px',
      overflowX: 'auto'
    }}>
      {tabs.map((tab) => {
        // active if exact match, or for sub-paths of non-root tabs
        const isActive = pathname === tab.href || (tab.href !== '/contacts' && pathname.startsWith(tab.href))
        const Icon = tab.icon

        return (
          <Link
            key={tab.name}
            href={tab.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              color: isActive ? 'var(--primary)' : '#64748b',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.9rem',
              borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.15s ease',
              marginBottom: '-3px',
              whiteSpace: 'nowrap'
            }}
            className="contacts-nav-tab"
          >
            <Icon size={16} />
            {tab.name}
          </Link>
        )
      })}
      <style jsx global>{`
        .contacts-nav-tab:hover {
          color: var(--foreground) !important;
        }
      `}</style>
    </div>
  )
}
