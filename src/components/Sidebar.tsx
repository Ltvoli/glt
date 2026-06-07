'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CheckSquare, Mail, HelpCircle, CalendarDays, LogOut, Bell, FileText, Settings, ShieldAlert, Folder, MapPin } from 'lucide-react'
import { logoutAction as logout } from '@/lib/auth-actions'

const navItems = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
  { name: 'Courriers', href: '/mails', icon: Mail },
  { name: 'Questions (QE)', href: '/qe', icon: HelpCircle },
  { name: 'Documents', href: '/documents', icon: Folder },
  { name: 'Planning', href: '/planning', icon: CalendarDays },
  { name: 'Permanences', href: '/permanences', icon: MapPin },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Rapports', href: '/reports/weekly', icon: FileText },
  { name: 'Tags (Paramètres)', href: '/settings/tags', icon: Settings },
  { name: 'RGPD & Sécurité', href: '/rgpd', icon: ShieldAlert },
]

export default function Sidebar({ userRole, activeModules = [] }: { userRole?: string, activeModules?: string[] }) {
  const pathname = usePathname()

  const moduleMap: Record<string, string> = {
    '/contacts': 'contacts',
    '/tasks': 'tasks',
    '/mails': 'mailcases',
    '/qe': 'questions',
    '/planning': 'agenda',
    '/reports/weekly': 'reports',
    '/permanences': 'permanences'
  }

  const items = navItems.filter(item => {
    const mod = moduleMap[item.href]
    if (mod) return activeModules.includes(mod)
    return true // Always show items that are not tied to a specific toggleable module
  })

  if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
    items.push({ name: 'Administration', href: '/admin', icon: ShieldAlert })
  }

  return (
    <aside style={{ 
      width: '250px', 
      backgroundColor: 'var(--sidebar-bg)', 
      color: 'var(--sidebar-fg)', 
      height: '100vh', 
      position: 'fixed', 
      left: 0, 
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 0'
    }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Bureau<br/>Parlementaire</h2>
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <li key={item.name} style={{ margin: '0.25rem 1rem' }}>
                <Link 
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 1rem',
                    backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                    color: isActive ? 'white' : '#94a3b8',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'
                      e.currentTarget.style.color = '#e2e8f0'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#94a3b8'
                    }
                  }}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div style={{ padding: '0 1.5rem', marginTop: 'auto' }}>
        {(userRole === 'ADMIN' || userRole === 'SUPERADMIN') && (
          <Link 
            href="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: pathname.startsWith('/settings') ? 'var(--sidebar-active)' : 'transparent',
              color: pathname.startsWith('/settings') ? 'white' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
              marginBottom: '0.5rem',
              fontWeight: pathname.startsWith('/settings') ? 500 : 400,
            }}
            onMouseOver={(e) => {
              if (!pathname.startsWith('/settings')) {
                e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'
              }
            }}
            onMouseOut={(e) => {
              if (!pathname.startsWith('/settings')) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <Settings size={20} />
            Settings
          </Link>
        )}

        <button 
          onClick={async () => { await logout() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
