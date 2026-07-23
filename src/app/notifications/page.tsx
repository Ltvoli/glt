import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Bell, Info, CheckCircle2, Inbox } from 'lucide-react'

function formatRelativeDate(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours   = Math.floor(diff / 3600000)
  const days    = Math.floor(diff / 86400000)

  if (minutes < 1)  return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24)   return `Il y a ${hours}h`
  if (days === 1)   return 'Hier'
  if (days < 7)     return `Il y a ${days} jours`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function groupByDate(notifications: any[]) {
  const groups: Record<string, any[]> = {}
  for (const n of notifications) {
    const d = new Date(n.createdAt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    const key = days === 0 ? "Aujourd'hui" : days === 1 ? 'Hier' : `Il y a ${days} jours`
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }
  return groups
}

const severityConfig: Record<string, { icon: any; bg: string; border: string; iconColor: string }> = {
  URGENT: { icon: AlertTriangle, bg: '#fff1f2', border: '#fecdd3', iconColor: '#ef4444' },
  WARNING: { icon: Bell,         bg: '#fffbeb', border: '#fde68a', iconColor: '#f59e0b' },
  INFO:    { icon: Info,         bg: '#eff6ff', border: '#bfdbfe', iconColor: '#3b82f6' },
}

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where:    { userId: session.userId },
    orderBy:  { createdAt: 'desc' },
    take:     100,
  })

  const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id)

  // Mark all as read
  if (unreadIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: unreadIds } },
      data:  { readAt: new Date() },
    })
  }

  const grouped = groupByDate(notifications)

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.75rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadIds.length > 0 && ` · ${unreadIds.length} non lue${unreadIds.length > 1 ? 's' : ''} marquée${unreadIds.length > 1 ? 's' : ''} comme lue${unreadIds.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: '999px',
          background: '#f1f5f9',
          fontSize: '0.8rem', color: '#64748b',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
          Toutes marquées comme lues
        </div>
      </div>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          <Inbox size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Aucune notification</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Vous êtes à jour !</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date group header */}
              <div style={{
                fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '0.5rem',
                paddingLeft: '0.25rem',
              }}>
                {dateLabel}
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((notif, idx) => {
                  const cfg = severityConfig[notif.severity] || severityConfig.INFO
                  const Icon = cfg.icon
                  const isNew = unreadIds.includes(notif.id)

                  return (
                    <div
                      key={notif.id}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: isNew ? '#fafbff' : 'white',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={17} color={cfg.iconColor} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start',
                          justifyContent: 'space-between', gap: '0.5rem',
                        }}>
                          <h3 style={{
                            fontWeight: 600, fontSize: '0.9rem',
                            color: '#0f172a', margin: 0,
                          }}>
                            {notif.title}
                            {isNew && (
                              <span style={{
                                marginLeft: '8px',
                                padding: '1px 6px', borderRadius: '999px',
                                background: '#dbeafe', color: '#1d4ed8',
                                fontSize: '0.68rem', fontWeight: 700,
                                verticalAlign: 'middle',
                              }}>
                                Nouveau
                              </span>
                            )}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                            {formatRelativeDate(new Date(notif.createdAt))}
                          </span>
                        </div>

                        <p style={{
                          fontSize: '0.83rem', color: '#64748b',
                          margin: '4px 0 0', lineHeight: 1.5,
                        }}>
                          {notif.message}
                        </p>

                        {/* Action link */}
                        {notif.relatedType && notif.relatedId && (
                          <Link
                            href={
                              notif.relatedType === 'Task'            ? `/tasks/${notif.relatedId}` :
                              notif.relatedType === 'MailCase'        ? `/mails/${notif.relatedId}` :
                              notif.relatedType === 'WrittenQuestion' ? `/qe/${notif.relatedId}` :
                              notif.relatedType === 'Contact'         ? `/contacts/${notif.relatedId}` :
                              notif.relatedType === 'Document'        ? `/documents?status=PENDING` :
                              notif.relatedType === 'Planning'        ? `/planning` :
                              '#'
                            }
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              marginTop: '8px', padding: '3px 10px',
                              background: '#f1f5f9', borderRadius: '6px',
                              fontSize: '0.78rem', color: '#3b82f6',
                              textDecoration: 'none', fontWeight: 500,
                              transition: 'background 0.1s',
                            }}
                          >
                            Voir {notif.relatedType === 'Task' ? 'la tâche' :
                                  notif.relatedType === 'MailCase' ? 'le courrier' :
                                  notif.relatedType === 'Contact' ? 'le contact' :
                                  notif.relatedType === 'Document' ? 'le document à valider' :
                                  notif.relatedType === 'Planning' ? 'le planning' :
                                  'la fiche / discours'} →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
