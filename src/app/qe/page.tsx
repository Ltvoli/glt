import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, HelpCircle, AlertCircle, FileText } from 'lucide-react'

export default async function QEPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  
  let whereClause: any = {}
  
  if (filter === 'draft') {
    whereClause.status = 'BROUILLON'
  } else if (filter === 'pending') {
    whereClause.status = 'DEPOSEE'
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
      case 'DEPOSEE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Déposée (Attente Rép.)</span>
      case 'REPONSE_RECUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Réponse Reçue</span>
      case 'RETOUR_EFFECTUE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>Retour Effectué</span>
      default: return <span>{status}</span>
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Questions Écrites (QE)</h1>
        <Link href="/qe/new" className="button">
          <Plus size={16} /> Nouvelle Question
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
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

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Type & Titre</th>
              <th>Ministère</th>
              <th>Thématique</th>
              <th>Collaborateur</th>
              <th>Date de Dépôt</th>
              <th>Statut</th>
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
                      {qe.title}
                    </div>
                  </td>
                  <td>{qe.ministry || '-'}</td>
                  <td>{qe.theme || '-'}</td>
                  <td>{qe.assignee?.name || '-'}</td>
                  <td>{qe.depositDate ? new Date(qe.depositDate).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>{getStatusBadge(qe.status)}</td>
                  <td>
                    <Link href={`/qe/${qe.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
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
