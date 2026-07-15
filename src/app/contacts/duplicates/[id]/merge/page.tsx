import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MergeDuplicateForm from './merge-duplicate-form'

export default async function MergeDuplicatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { id } = await params
  const { a, b } = await searchParams

  if (id === 'merge') {
    if (!a || !b) return notFound()

    const contact1 = await prisma.contact.findUnique({
      where: { id: a },
      include: { tags: { include: { tag: true } } }
    })
    const contact2 = await prisma.contact.findUnique({
      where: { id: b },
      include: { tags: { include: { tag: true } } }
    })

    if (!contact1 || !contact2) return notFound()

    const candidate = {
      id: 'manual',
      contact1,
      contact2
    }

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/contacts" className="button outline">← Retour aux contacts</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Fusion de contacts</h1>
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

  // Comportement standard pour un doublon détecté
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
