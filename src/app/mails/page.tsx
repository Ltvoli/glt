import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Mail, Package, AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function MailsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await getSession()
  const { filter } = await searchParams
  
  let whereClause: any = {}
  
  if (filter === 'mine') {
    whereClause.assigneeId = session?.userId
  } else if (filter === 'urgent') {
    whereClause.urgency = 'HAUTE'
    whereClause.status = { notIn: ['REPONDU', 'CLASSE'] }
  } else if (filter === 'pending') {
    whereClause.status = { in: ['RECU', 'LU', 'EN_TRAITEMENT'] }
  } else if (filter === 'entrant') {
    whereClause.type = 'ENTRANT'
  } else if (filter === 'sortant') {
    whereClause.type = 'SORTANT'
  } else if (filter === 'late') {
    whereClause.responseDueDate = { lt: new Date() }
    whereClause.status = { notIn: ['REPONDU', 'CLASSE'] }
  }

  const mails = await prisma.mailCase.findMany({
    where: whereClause,
    include: {
      assignee: { select: { name: true } },
      links: {
        include: {
          contact: { select: { firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { receiveDate: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Reçu</span>
      case 'LU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Lu</span>
      case 'EN_TRAITEMENT': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>En traitement</span>
      case 'REPONDU': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Répondu</span>
      case 'CLASSE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Classé</span>
      default: return <span>{status}</span>
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Courriers</h1>
        <Link href="/mails/new" className="button">
          <Plus size={16} /> Nouveau Courrier
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href="/mails" className={`button ${!filter ? 'primary' : 'outline'}`}>Tous</Link>
        <Link href="/mails?filter=pending" className={`button ${filter === 'pending' ? 'primary' : 'outline'}`}>À traiter</Link>
        <Link href="/mails?filter=mine" className={`button ${filter === 'mine' ? 'primary' : 'outline'}`}>Mes courriers</Link>
        <Link href="/mails?filter=urgent" className={`button ${filter === 'urgent' ? 'primary' : 'outline'}`}>Urgents</Link>
        <Link href="/mails?filter=entrant" className={`button ${filter === 'entrant' ? 'primary' : 'outline'}`}>Entrants</Link>
        <Link href="/mails?filter=sortant" className={`button ${filter === 'sortant' ? 'primary' : 'outline'}`}>Sortants</Link>
        <Link href="/mails?filter=late" className={`button ${filter === 'late' ? 'primary' : 'outline'}`} style={{ borderColor: filter === 'late' ? 'var(--danger)' : '', color: filter === 'late' ? 'white' : 'var(--danger)', backgroundColor: filter === 'late' ? 'var(--danger)' : 'transparent' }}>
          En retard
        </Link>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Référence & Type</th>
              <th>Date</th>
              <th>Sujet & Expéditeur/Destinataire</th>
              <th>Canal</th>
              <th>Assigné à</th>
              <th>Statut & Échéance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mails.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucun courrier trouvé.
                </td>
              </tr>
            ) : (
              mails.map(mail => (
                <tr key={mail.id} style={{ borderLeft: mail.urgency === 'HAUTE' ? '4px solid var(--danger)' : '4px solid transparent' }}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{mail.reference}</div>
                    <div style={{ fontSize: '0.75rem', color: mail.type === 'ENTRANT' ? 'var(--primary)' : 'var(--warning)' }}>{mail.type}</div>
                  </td>
                  <td>{new Date(mail.receiveDate).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {mail.urgency === 'HAUTE' && <AlertCircle size={14} color="var(--danger)" />}
                      {mail.subject}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {mail.senderName || 'Inconnu'} {mail.city ? `(${mail.city})` : ''}
                      {mail.links.some((l: any) => l.contact) && (
                         <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                           🔗 Lié à un contact
                         </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {mail.channel === 'POSTAL' ? <span title="Postal"><Package size={16} /></span> : <span title="Email/Autre"><Mail size={16} /></span>}
                  </td>
                  <td>{mail.assignee?.name || '-'}</td>
                  <td>
                    <div style={{ marginBottom: '0.25rem' }}>{getStatusBadge(mail.status)}</div>
                    {mail.responseDueDate && mail.status !== 'REPONDU' && mail.status !== 'CLASSE' && (
                      <div style={{ fontSize: '0.75rem', color: new Date(mail.responseDueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {new Date(mail.responseDueDate).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </td>
                  <td>
                    <Link href={`/mails/${mail.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
