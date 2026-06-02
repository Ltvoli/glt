import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Bell, Info } from 'lucide-react'

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' }
  })

  // Marquer toutes les notifications comme lues
  await prisma.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() }
  })

  const getIcon = (severity: string) => {
    switch(severity) {
      case 'URGENT': return <AlertTriangle color="var(--danger)" />
      case 'WARNING': return <Bell color="var(--warning)" />
      default: return <Info color="var(--primary)" />
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Notifications</h1>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Aucune notification.</p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', opacity: notif.readAt ? 0.8 : 1 }}>
              <div style={{ marginTop: '0.25rem' }}>
                {getIcon(notif.severity)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontWeight: 'bold' }}>{notif.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(notif.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{notif.message}</p>
                {notif.relatedType === 'Task' && notif.relatedId && (
                  <Link href={`/tasks/${notif.relatedId}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Voir la tâche
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
