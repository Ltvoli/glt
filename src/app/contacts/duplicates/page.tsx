import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Check, Trash2, ArrowRight } from 'lucide-react'
import DuplicateActionsForm from './duplicate-actions-form'
import DetectDuplicatesButton from './detect-duplicates-button'
import BulkMergeButton from './bulk-merge-button'


export default async function DuplicatesPage() {
  const candidates = await prisma.duplicateCandidate.findMany({
    where: { status: 'PENDING' },
    include: {
      contact1: true,
      contact2: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  // Statistiques de la base de données
  const totalContacts = await prisma.contact.count({
    where: { archivedAt: null }
  })

  // Compter les contacts avec nom/prénom/nom d'usage exact identique
  const duplicateContactsCountResult = await prisma.$queryRawUnsafe<{ count: number }[]>(`
    SELECT COALESCE(SUM(count)::integer, 0) as count FROM (
      SELECT COUNT(*) as count
      FROM "Contact"
      WHERE "archivedAt" IS NULL
      GROUP BY LOWER("firstName"), LOWER(COALESCE(NULLIF("usageName", ''), "lastName"))
      HAVING COUNT(*) > 1
    ) dup;
  `)
  const duplicateContactsCount = duplicateContactsCountResult[0]?.count || 0

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div>
      {/* Statistiques & Actions de masse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacts Actifs</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b' }}>
            {totalContacts.toLocaleString()}
          </p>
        </div>
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doublons de noms exacts</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.875rem', fontWeight: 'bold', color: '#92400e' }}>
            {duplicateContactsCount.toLocaleString()}
          </p>
          <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
            Partageant les mêmes prénom et nom / nom d'usage
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/contacts" className="button outline">Retour aux contacts</Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Gestion des Doublons Potentiels</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DetectDuplicatesButton />
          <BulkMergeButton />
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Check size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Aucun doublon détecté pour le moment.</p>
        </div>
      ) : (
        <div style={{ gridTemplateColumns: '1fr', display: 'grid', gap: '1.5rem' }}>
          {candidates.map(candidate => (
            <div key={candidate.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 200px', gap: '1.5rem', alignItems: 'center' }}>
              
              {/* Contact 1 */}
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                  {candidate.contact1.firstName} {candidate.contact1.lastName}
                  {candidate.contact1.usageName ? <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400, marginLeft: '0.4rem' }}>({candidate.contact1.usageName})</span> : null}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {candidate.contact1.usageName && <div>Nom d'usage : {candidate.contact1.usageName}</div>}
                  <div>Email: {candidate.contact1.email || '-'}</div>
                  <div>Tél: {candidate.contact1.phone || candidate.contact1.mobilePhone || '-'}</div>
                  <div>Créé le: {formatDate(candidate.contact1.createdAt)}</div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <Link href={`/contacts/${candidate.contact1.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} target="_blank">
                    Voir la fiche
                  </Link>
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {candidate.reason === 'NOM_EMAIL' ? 'EMAIL' : candidate.reason === 'NOM_PHONE' ? 'TEL' : 'NOM'}
                </span>
                <ArrowRight size={24} />
              </div>

              {/* Contact 2 */}
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                  {candidate.contact2.firstName} {candidate.contact2.lastName}
                  {candidate.contact2.usageName ? <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400, marginLeft: '0.4rem' }}>({candidate.contact2.usageName})</span> : null}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {candidate.contact2.usageName && <div>Nom d'usage : {candidate.contact2.usageName}</div>}
                  <div>Email: {candidate.contact2.email || '-'}</div>
                  <div>Tél: {candidate.contact2.phone || candidate.contact2.mobilePhone || '-'}</div>
                  <div>Créé le: {formatDate(candidate.contact2.createdAt)}</div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <Link href={`/contacts/${candidate.contact2.id}`} className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} target="_blank">
                    Voir la fiche
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div>
                <DuplicateActionsForm 
                  candidateId={candidate.id} 
                  contact1Id={candidate.contact1.id} 
                  contact2Id={candidate.contact2.id} 
                />
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
