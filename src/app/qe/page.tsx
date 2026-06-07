import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Download, AlertTriangle } from 'lucide-react'
import { relaunchQe, redepositQe } from './actions'

export default async function QEPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string, q?: string }>
}) {
  const { filter, q } = await searchParams
  
  const whereClause: { archivedAt: null; OR?: any[]; status?: string } = { archivedAt: null }
  
  if (q) {
    whereClause.OR = [
      { title: { contains: q } },
      { anNumber: { contains: q } },
      { ministry: { contains: q } },
      { theme: { contains: q } },
      { notes: { contains: q } }
    ]
  }
  
  if (filter === 'draft') {
    whereClause.status = 'BROUILLON'
  } else if (filter === 'pending') {
    whereClause.status = 'EN_ATTENTE'
  } else if (filter === 'answered') {
    whereClause.status = 'REPONSE_RECUE'
  }

  const questions = await prisma.writtenQuestion.findMany({
    where: whereClause,
    include: {
      assignee: { select: { name: true } }
    },
    orderBy: { updatedAt: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROUILLON': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Brouillon</span>
      case 'EN_ATTENTE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>En attente</span>
      case 'REPONSE_RECUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Réponse Reçue</span>
      case 'RETOUR_EFFECTUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Retour Effectué</span>
      default: return <span>{status}</span>
    }
  }

  const getDelayAlert = (status: string, depositDate: Date | null) => {
    if (status !== 'EN_ATTENTE' || !depositDate) return { text: '-', isLate: false }
    const daysDiff = Math.floor((new Date().getTime() - depositDate.getTime()) / (1000 * 3600 * 24))
    if (daysDiff >= 60) {
      return { text: `${daysDiff}j (Alerte >60j)`, isLate: true }
    }
    return { text: `${daysDiff}j`, isLate: false }
  }

  return (
    <div>
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
            Brouillons
          </Link>
          <Link href="/qe?filter=pending" className={`button ${filter === 'pending' ? 'primary' : 'outline'}`}>
            En attente de réponse
          </Link>
          <Link href="/qe?filter=answered" className={`button ${filter === 'answered' ? 'primary' : 'outline'}`}>
            Réponses reçues
          </Link>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Numéro / Titre</th>
              <th>Ministère</th>
              <th>Thématique</th>
              <th>Date de Dépôt</th>
              <th>Statut</th>
              <th>Délai</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune question trouvée.
                </td>
              </tr>
            ) : (
              questions.map(qe => (
                <tr key={qe.id}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>
                        {qe.type}
                      </span>
                      {qe.anNumber && <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>#{qe.anNumber}</span>}
                      {qe.title}
                    </div>
                  </td>
                  <td>{qe.ministry || '-'}</td>
                  <td>{qe.theme || '-'}</td>
                  <td>{qe.depositDate ? new Date(qe.depositDate).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>{getStatusBadge(qe.status)}</td>
                  <td>
                    {(() => {
                      const delay = getDelayAlert(qe.status, qe.depositDate)
                      if (delay.isLate) {
                        return <span style={{ color: 'var(--danger)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={14} /> {delay.text}</span>
                      }
                      return <span>{delay.text}</span>
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link href={`/qe/${qe.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Voir
                      </Link>
                      {getDelayAlert(qe.status, qe.depositDate).isLate && (
                        <>
                          <form action={async () => {
                            'use server'
                            await relaunchQe(qe.id)
                          }}>
                            <button type="submit" className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}>Relancer</button>
                          </form>
                          <form action={async () => {
                            'use server'
                            await redepositQe(qe.id)
                          }}>
                            <button type="submit" className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Redéposer</button>
                          </form>
                        </>
                      )}
                    </div>
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
