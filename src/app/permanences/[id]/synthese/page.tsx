import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SyntheseClient from './synthese-client'

export default async function SynthesePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.read') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const { id } = await params

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null },
    include: {
      synthesis: {
        include: { signedByUser: true }
      },
      contacts: true,
      organizations: true,
      tasks: true
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  // Pre-fill generators
  const attentionContacts = permanence.contacts.filter(c => c.requiresDeputyAttention)
  const overdueTasks = permanence.tasks.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < new Date())
  
  const prefillAttention = [
    attentionContacts.length > 0 ? "=== SIGNALEMENTS CITOYENS ===\n" + attentionContacts.map(c => `- ${c.firstName} ${c.lastName} (${c.phone || ''}) : ${c.requestSummary || 'Demande de rendez-vous'}`).join('\n') : '',
    overdueTasks.length > 0 ? "\n=== TÂCHES EN RETARD ===\n" + overdueTasks.map(t => `- [${t.section.toUpperCase()}] ${t.label} (Échéance : ${t.dueDate?.toLocaleDateString('fr-FR')})`).join('\n') : ''
  ].filter(Boolean).join('\n')

  const recommendedMerchants = permanence.organizations.filter(o => o.visitRecommended)
  const prefillMerchant = recommendedMerchants.length > 0
    ? "=== PARCOURS COMMERCES RECOMMANDÉS ===\n" + recommendedMerchants.map(o => `- ${o.orgName} (${o.sector || 'Général'}) : ${o.concern || 'À visiter'}`).join('\n')
    : "Aucun commerce recommandé à visiter pour le moment."

  const reachedContacts = permanence.contacts.filter(c => c.callStatus === 'REACHED' || c.callStatus === 'CALLBACK_REQUESTED')
  const prefillPhoning = reachedContacts.length > 0
    ? "=== COMPTE RENDU APPELS / RETOURS ===\n" + reachedContacts.map(c => `- ${c.firstName} ${c.lastName} (Statut : ${c.callStatus === 'REACHED' ? 'Joint' : 'Rappel demandé'}) : ${c.requestSummary || 'Pas de note'}`).join('\n')
    : "Aucun contact joint pour le moment."

  const hasValidatePermission = session.permissions.includes('permanences.validate') || session.role === 'SUPERADMIN'
  const isReadOnly = session.role === 'READONLY'

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* BREADCRUMB */}
      <div className="hide-on-print" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/permanences" className="text-blue-600 hover:underline">Permanences</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&gt;</span>
        <Link href={`/permanences/${id}`} className="text-blue-600 hover:underline">{permanence.title}</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--text-muted)' }}>Synthèse Député</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Synthèse d'activité du Député</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Cette fiche récapitule les points clés de la permanence mobile.</p>
        </div>
      </div>

      <SyntheseClient
        permanenceId={id}
        synthesis={permanence.synthesis}
        prefillAttention={prefillAttention}
        prefillMerchant={prefillMerchant}
        prefillPhoning={prefillPhoning}
        isReadOnly={isReadOnly}
        hasValidatePermission={hasValidatePermission}
      />
    </div>
  )
}
