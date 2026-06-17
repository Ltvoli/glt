import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Download, AlertTriangle } from 'lucide-react'
import { relaunchQe, redepositQe } from './actions'
import PaginationBar from '../contacts/pagination-bar'
import QeTableClient from './qe-table-client'

export default async function QEPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, q?: string, page?: string, perPage?: string }>
}) {
  const { filter, q, page, perPage } = await searchParams
  
  const currentPage = Math.max(1, parseInt(page || '1'))
  const itemsPerPage = Math.min(200, Math.max(10, parseInt(perPage || '50')))

  const whereClause: { archivedAt: null; OR?: any[]; status?: string } = { archivedAt: null }
  
  if (q) {
    whereClause.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { anNumber: { contains: q, mode: 'insensitive' } },
      { ministry: { contains: q, mode: 'insensitive' } },
      { theme: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } }
    ]
  }
  
  if (filter === 'draft') {
    whereClause.status = 'A_REDIGER'
  } else if (filter === 'pending') {
    whereClause.status = 'VALIDER'
  } else if (filter === 'refused') {
    whereClause.status = 'REFUSE'
  } else if (filter === 'answered') {
    whereClause.status = 'TERMINE'
  }

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const [questions, totalQuestions, overdueQe] = await Promise.all([
    prisma.writtenQuestion.findMany({
      where: whereClause,
      include: {
        assignee: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
    }),
    prisma.writtenQuestion.count({ where: whereClause }),
    prisma.writtenQuestion.findMany({
      where: {
        status: 'VALIDER',
        depositDate: { lt: sixtyDaysAgo },
        responseDate: null,
        archivedAt: null,
      },
      select: { id: true, title: true },
      orderBy: { depositDate: 'asc' },
    })
  ])

  const totalPages = Math.ceil(totalQuestions / itemsPerPage)



  return (
    <div>
      {overdueQe.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderLeft: '4px solid #dc2626',
          borderRadius: '8px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>
              {overdueQe.length} question{overdueQe.length > 1 ? 's' : ''} écrite{overdueQe.length > 1 ? 's' : ''} sans réponse depuis plus de 2 mois
            </p>
            <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.25rem' }}>
              {overdueQe.slice(0, 5).map(qe => (
                <li key={qe.id}>
                  <Link href={`/qe/${qe.id}`} style={{ color: '#dc2626', textDecoration: 'underline' }}>
                    {qe.title}
                  </Link>
                </li>
              ))}
            </ul>
            {overdueQe.length > 5 && (
              <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                + {overdueQe.length - 5} autre{overdueQe.length - 5 > 1 ? 's' : ''}
              </p>
            )}
            <Link href="/qe?filter=pending" style={{
              display: 'inline-block',
              fontSize: '0.875rem',
              color: '#dc2626',
              fontWeight: '600',
              textDecoration: 'underline'
            }}>
              Voir toutes →
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Questions Écrites (QE)</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/api/export/qe${filter ? `?filter=${filter}` : ''}`} className="button outline" download>
            <Download size={16} /> Export CSV
          </a>
          <Link href="/qe/new" className="button">
            <Plus size={16} /> Nouvelle Question
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <form style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            name="q" 
            defaultValue={q || ''} 
            placeholder="Rechercher par n°, titre, ministère..." 
            className="form-control" 
            style={{ margin: 0, height: '100%' }}
          />
          <button type="submit" className="button">Rechercher</button>
        </form>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/qe" className={`button ${!filter ? 'primary' : 'outline'}`}>
            Toutes
          </Link>
          <Link href="/qe?filter=draft" className={`button ${filter === 'draft' ? 'primary' : 'outline'}`}>
            À rédiger
          </Link>
          <Link href="/qe?filter=pending" className={`button ${filter === 'pending' ? 'primary' : 'outline'}`}>
            Déposées
          </Link>
          <Link href="/qe?filter=refused" className={`button ${filter === 'refused' ? 'primary' : 'outline'}`}>
            Refusées
          </Link>
          <Link href="/qe?filter=answered" className={`button ${filter === 'answered' ? 'primary' : 'outline'}`}>
            Terminées
          </Link>
        </div>
      </div>

      <QeTableClient questions={JSON.parse(JSON.stringify(questions))} />
      <div style={{ marginTop: '1.5rem' }}>
        <PaginationBar currentPage={currentPage} totalPages={totalPages} currentParams={{ filter, q, page, perPage }} itemsPerPage={itemsPerPage} />
      </div>
    </div>
  )
}
