import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Check, Trash2, ArrowRight } from 'lucide-react'
import DuplicateActionsForm from './duplicate-actions-form'
import DetectDuplicatesButton from './detect-duplicates-button'


export default async function DuplicatesPage() {
  const candidates = await prisma.duplicateCandidate.findMany({
    where: { status: 'PENDING' },
    include: {
      contact1: true,
      contact2: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/contacts" className="button outline">Retour aux contacts</Link>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Gestion des Doublons Potentiels</h1>
        </div>
        <DetectDuplicatesButton />
      </div>

      {candidates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Check size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Aucun doublon détecté pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {candidates.map(candidate => (
            <div key={candidate.id} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 200px', gap: '1.5rem', alignItems: 'center' }}>
              
              {/* Contact 1 */}
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{candidate.contact1.firstName} {candidate.contact1.lastName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <div>Email: {candidate.contact1.email || '-'}</div>
                  <div>Tél: {candidate.contact1.phone || candidate.contact1.mobilePhone || '-'}</div>
                  <div>Créé le: {candidate.contact1.createdAt.toLocaleDateString()}</div>
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
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{candidate.contact2.firstName} {candidate.contact2.lastName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <div>Email: {candidate.contact2.email || '-'}</div>
                  <div>Tél: {candidate.contact2.phone || candidate.contact2.mobilePhone || '-'}</div>
                  <div>Créé le: {candidate.contact2.createdAt.toLocaleDateString()}</div>
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
