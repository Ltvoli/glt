import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ShieldAlert, Users, LayoutDashboard } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (user?.role !== 'SUPERADMIN') {
    redirect('/')
  }

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <aside style={{ width: '250px', flexShrink: 0, borderRight: '1px solid var(--border)', minHeight: '80vh', paddingRight: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--danger)' }}>
          <ShieldAlert size={24} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>SuperAdmin</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/admin" className="button outline" style={{ justifyContent: 'flex-start', border: 'none', textAlign: 'left', display: 'flex', gap: '0.5rem' }}>
            <LayoutDashboard size={16} /> Vue Globale
          </Link>
          <Link href="/admin/users" className="button outline" style={{ justifyContent: 'flex-start', border: 'none', textAlign: 'left', display: 'flex', gap: '0.5rem' }}>
            <Users size={16} /> Utilisateurs
          </Link>
        </nav>
      </aside>
      
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
