import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MergeDuplicateForm from './merge-duplicate-form'

export default async function MergeDuplicatePage({
  params,
}: {
  params: Promise<{ id: string }>  // ← Next.js 15+ : params est une Promise
}) {
  const { id } = await params  // ← await obligatoire

  const candidate = await prisma.duplicateCandidate.findUnique({
    where: { id },
    include: {
      contact1: { include: { tags: { include: { tag: true } } } },
      contact2: { include: { tags: { include: { tag: true } } } },
    }
  })

  if (!candidate) return notFound()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/contacts/duplicates" className="button outline">← Retour aux doublons</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Fusion de doublon</h1>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
          ⚠️ Sélectionnez pour chaque champ la valeur à conserver. Le contact retenu sera mis à jour, 
          l'autre sera archivé. Les tâches, courriers, QE et tags de l'autre seront <strong>transférés</strong> automatiquement.
        </p>
      </div>

      <div className="card">
        <MergeDuplicateForm
          candidateId={candidate.id}
          contact1={candidate.contact1 as any}
          contact2={candidate.contact2 as any}
        />
      </div>
    </div>
  )
}
