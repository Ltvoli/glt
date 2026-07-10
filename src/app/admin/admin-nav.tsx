'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users2, 
  SlidersHorizontal, 
  Tags, 
  HeartHandshake, 
  Webhook,
  Database,
  FileText,
  Activity,
  BookOpen
} from 'lucide-react'

type AdminNavProps = {
  dbRole: string
}

export default function AdminNav({ dbRole }: AdminNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      name: 'Mon espace',
      href: '/admin',
      icon: Building2,
      exact: true
    },
    {
      name: 'Membres & Rôles',
      href: '/admin/members',
      icon: Users2
    },
    {
      name: 'Modules & Pages',
      href: '/admin/modules',
      icon: SlidersHorizontal
    },
    {
      name: 'Champs & Formulaires',
      href: '/admin/fields',
      icon: Database
    },
    {
      name: 'Tags',
      href: '/admin/tags',
      icon: Tags
    },
    {
      name: 'Niveaux de soutien',
      href: '/admin/support-levels',
      icon: HeartHandshake
    },
    {
      name: 'Dictionnaire',
      href: '/admin/dictionary',
      icon: BookOpen
    },
    {
      name: 'Modèles (Publipostage)',
      href: '/admin/templates/docs',
      icon: FileText
    },
    {
      name: 'Intégrations & API',
      href: '/admin/integrations',
      icon: Webhook,
      hideForSupervisor: true
    },
    {
      name: 'Données & RGPD',
      href: '/admin/data-retention',
      icon: Database,
      hideForSupervisor: true
    },
    {
      name: 'Logs & Erreurs',
      href: '/admin/logs',
      icon: Activity,
    }
  ]

  const filteredTabs = tabs.filter(tab => {
    if (tab.hideForSupervisor && dbRole === 'SUPERVISEUR') {
      return false
    }
    return true
  })

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
        {filteredTabs.map(tab => {
          const Icon = tab.icon
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href) && (tab.href !== '/admin' || pathname === '/admin')
            
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
