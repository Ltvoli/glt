import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MergeDuplicateForm from './merge-duplicate-form'

export default async function MergeDuplicatePage({ params }: { params: { id: string } }) {
  const candidate = await prisma.duplicateCandidate.findUnique({
    where: { id: params.id },
    include: {
      contact1: true,
      contact2: true
    }
  })

  if (!candidate) return notFound()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/contacts/duplicates" className="button outline">Retour aux doublons</Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Fusion Avancée</h1>
      </div>

      <div className="card">
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          Sélectionnez pour chaque champ la valeur que vous souhaitez conserver. Le contact résultant prendra ces valeurs, et l'autre contact sera archivé.
        </p>

        <MergeDuplicateForm 
          candidateId={candidate.id}
          contact1={candidate.contact1}
          contact2={candidate.contact2}
        />
      </div>
    </div>
  )
}
