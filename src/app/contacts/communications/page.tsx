import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContactsTabs from '../contacts-tabs'
import { Mail, MessageSquare, Calendar, User, Users, CheckCircle, AlertCircle } from 'lucide-react'

export default async function CommunicationsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const campaigns = await prisma.bulkCommunication.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Contacts</h1>
        </div>
      </div>

      <ContactsTabs />

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0f172a' }}>
          Historique des campagnes d'envoi
        </h2>

        {campaigns.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <Mail size={40} style={{ marginBottom: '1rem', opacity: 0.5, color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Aucune campagne envoyée pour le moment.</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              Sélectionnez des contacts ou utilisez une liste de diffusion pour leur envoyer un message groupé.
            </p>
            <Link href="/contacts" className="button" style={{ display: 'inline-flex', marginTop: '1.25rem', fontSize: '0.85rem' }}>
              Sélectionner des contacts
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem' }}>Date d'envoi</th>
                  <th style={{ padding: '0.75rem' }}>Canal</th>
                  <th style={{ padding: '0.75rem' }}>Expéditeur</th>
                  <th style={{ padding: '0.75rem' }}>Objet / Message</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Statut & Volume</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const dateStr = new Date(c.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })

                  const isEmail = c.channel === 'EMAIL'

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <Calendar size={14} style={{ color: '#94a3b8' }} />
                          {dateStr}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: isEmail ? '#eff6ff' : '#f0fdf4',
                          color: isEmail ? '#1d4ed8' : '#15803d'
                        }}>
                          {isEmail ? <Mail size={12} /> : <MessageSquare size={12} />}
                          {c.channel}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <User size={14} style={{ color: '#94a3b8' }} />
                          {c.createdBy.firstName} {c.createdBy.lastName}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {c.subject && (
                            <strong style={{ color: '#0f172a', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {c.subject}
                            </strong>
                          )}
                          <span style={{
                            color: '#64748b',
                            fontSize: '0.85rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {c.content}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', verticalAlign: 'top', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }} title="Succès">
                              <CheckCircle size={12} /> {c.successCount}
                            </span>
                            {c.failedCount > 0 && (
                              <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '3px' }} title="Échecs">
                                <AlertCircle size={12} /> {c.failedCount}
                              </span>
                            )}
                            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }} title="Total ciblé">
                              <Users size={12} /> {c.sentCount}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{
                            width: '100px',
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginTop: '2px'
                          }}>
                            <div style={{
                              width: `${(c.successCount / c.sentCount) * 100}%`,
                              height: '100%',
                              background: '#10b981'
                            }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
