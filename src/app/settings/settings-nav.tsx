'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  Settings, 
  ShieldCheck, 
  EyeOff
} from 'lucide-react'

export default function SettingsNav() {
  const pathname = usePathname()

  const tabs = [
    {
      name: 'Mon profil',
      href: '/settings/profile',
      icon: User
    },
    {
      name: 'Préférences',
      href: '/settings/preferences',
      icon: Settings
    },
    {
      name: 'Sécurité & Accès',
      href: '/settings/security',
      icon: ShieldCheck
    },
    {
      name: 'Confidentialité (RGPD)',
      href: '/settings/privacy',
      icon: EyeOff
    }
  ]

  return (
    <div style={{ 
      borderBottom: '1px solid var(--border)', 
      marginBottom: '2rem',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      <div style={{ 
        display: 'flex', 
        gap: '2rem', 
        padding: '0 0.5rem'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = pathname.startsWith(tab.href)
            
          return (
            <Link 
              key={tab.name}
              href={tab.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 0',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '500',
                fontSize: '0.925rem',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              {tab.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
