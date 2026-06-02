'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CheckSquare, Mail, HelpCircle, CalendarDays, LogOut, Bell, FileText } from 'lucide-react'
import { logout } from '@/lib/auth-actions'

const navItems = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
  { name: 'Courriers', href: '/mails', icon: Mail },
  { name: 'Questions (QE)', href: '/qe', icon: HelpCircle },
  { name: 'Planning', href: '/planning', icon: CalendarDays },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Rapports', href: '/reports/weekly', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

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
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isActive ? 'var(--sidebar-hover)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-muted)',
                    transition: 'background-color 0.2s, color 0.2s',
                    borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent'
                  }}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div style={{ padding: '0 1.5rem', marginTop: 'auto' }}>
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
