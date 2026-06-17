import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info, ArrowLeft } from 'lucide-react'
import LogsClient from './logs-client'

export const metadata = {
  title: 'Logs Applicatifs — Administration',
}

const LEVEL_FILTERS = ['ALL', 'ERROR', 'WARNING', 'INFO'] as const

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; page?: string }>
}) {
  const session = await getSession()
  if (!session?.userId || (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR')) {
    redirect('/')
  }

  const { level, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1'))
  const perPage = 50

  const where: any = {}
  if (level && level !== 'ALL') {
    where.level = level
  }

  const [logs, totalCount, errorCount, warnCount, infoCount] = await Promise.all([
    prisma.appLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * perPage,
      take: perPage,
    }),
    prisma.appLog.count({ where }),
    prisma.appLog.count({ where: { level: 'ERROR' } }),
    prisma.appLog.count({ where: { level: 'WARNING' } }),
    prisma.appLog.count({ where: { level: 'INFO' } }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour à l'administration
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Logs Applicatifs</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
          Suivi des erreurs techniques et alertes de l'application.
        </p>
      </div>

      {/* Compteurs par niveau */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #dc2626', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#dc2626" />
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Erreurs</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{errorCount}</p>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #d97706', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#d97706" />
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Avertissements</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{warnCount}</p>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Info size={20} color="#2563eb" />
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Informatifs</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{infoCount}</p>
          </div>
        </div>
      </div>

      {/* Filtres par niveau */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {LEVEL_FILTERS.map(l => (
          <Link
            key={l}
            href={`/admin/logs${l !== 'ALL' ? `?level=${l}` : ''}`}
            className={`button ${(!level && l === 'ALL') || level === l ? '' : 'outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            {l === 'ALL' ? 'Tous' : l}
          </Link>
        ))}
      </div>

      <LogsClient logs={JSON.parse(JSON.stringify(logs))} totalCount={totalCount} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          {currentPage > 1 && (
            <Link href={`/admin/logs?${level ? `level=${level}&` : ''}page=${currentPage - 1}`} className="button outline" style={{ fontSize: '0.8rem' }}>
              Précédent
            </Link>
          )}
          <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Page {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/admin/logs?${level ? `level=${level}&` : ''}page=${currentPage + 1}`} className="button outline" style={{ fontSize: '0.8rem' }}>
              Suivant
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
