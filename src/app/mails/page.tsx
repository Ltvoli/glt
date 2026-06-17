import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Mail, Package, AlertCircle, Clock } from 'lucide-react'
import { getSession } from '@/lib/session'
import PaginationBar from '../contacts/pagination-bar'
import { Search } from 'lucide-react'
import MailTableClient from './mail-table-client'

export default async function MailsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, page?: string, perPage?: string, q?: string }>
}) {
  const session = await getSession()
  const { filter, page, perPage, q } = await searchParams
  
  const currentPage = Math.max(1, parseInt(page || '1'))
  const itemsPerPage = Math.min(200, Math.max(10, parseInt(perPage || '50')))

  const whereClause: any = {}
  
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
  } else if (filter === 'to_validate') {
    whereClause.validationStatus = 'A_VALIDER'
    if (session?.dbRole !== 'ADMINISTRATEUR' && session?.dbRole !== 'SUPERVISEUR') {
      whereClause.assigneeId = session?.userId
    }
  } else if (filter === 'late') {
    whereClause.responseDueDate = { lt: new Date() }
    whereClause.status = { notIn: ['REPONDU', 'CLASSE'] }
  }

  if (q) {
    whereClause.OR = [
      { subject: { contains: q, mode: 'insensitive' } },
      { reference: { contains: q, mode: 'insensitive' } },
      { senderName: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [mails, totalMails] = await Promise.all([
    prisma.mailCase.findMany({
      where: whereClause,
      include: {
        assignee: { select: { name: true } },
        links: {
          include: {
            contact: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
    }),
    prisma.mailCase.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(totalMails / itemsPerPage)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Courriers</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/api/export/mails${filter ? `?filter=${filter}` : ''}`} className="button outline">
            Exporter CSV
          </a>
          <Link href="/mails/new" className="button">
            <Plus size={16} /> Nouveau Courrier
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href="/mails" className={`button ${!filter ? 'primary' : 'outline'}`}>Tous</Link>
        <Link href="/mails?filter=pending" className={`button ${filter === 'pending' ? 'primary' : 'outline'}`}>À traiter</Link>
        <Link href="/mails?filter=mine" className={`button ${filter === 'mine' ? 'primary' : 'outline'}`}>Mes courriers</Link>
        <Link href="/mails?filter=urgent" className={`button ${filter === 'urgent' ? 'primary' : 'outline'}`}>Urgents</Link>
        <Link href="/mails?filter=entrant" className={`button ${filter === 'entrant' ? 'primary' : 'outline'}`}>Entrants</Link>
        <Link href="/mails?filter=sortant" className={`button ${filter === 'sortant' ? 'primary' : 'outline'}`}>Sortants</Link>
        <Link href="/mails?filter=to_validate" className={`button ${filter === 'to_validate' ? 'primary' : 'outline'}`}>À valider</Link>
        <Link href="/mails?filter=late" className={`button ${filter === 'late' ? 'primary' : 'outline'}`} style={{ borderColor: filter === 'late' ? 'var(--danger)' : '', color: filter === 'late' ? 'white' : 'var(--danger)', backgroundColor: filter === 'late' ? 'var(--danger)' : 'transparent' }}>
          En retard
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '0.5rem', maxWidth: '500px' }}>
          {filter && <input type="hidden" name="filter" value={filter} />}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="q" 
              defaultValue={q || ''} 
              placeholder="Rechercher par sujet, référence, nom..." 
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="button">Rechercher</button>
        </form>
      </div>

      <MailTableClient mails={JSON.parse(JSON.stringify(mails))} />

      <div style={{ marginTop: '1.5rem' }}>
        <PaginationBar currentPage={currentPage} totalPages={totalPages} currentParams={{ filter, page, perPage, q }} itemsPerPage={itemsPerPage} />
      </div>
    </div>
  )
}
