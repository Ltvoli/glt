import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, User, MapPin, CheckCircle2, AlertTriangle, ChevronRight, FileSpreadsheet } from 'lucide-react'
import WorkflowButtons from './workflow-buttons'

export default async function PermanenceDashboardPage({
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
      ownerUser: true,
      validationUser: true,
      locations: {
        include: { commune: true }
      },
      tasks: {
        orderBy: { order: 'asc' }
      },
      synthesis: true
    }
  })

  if (!permanence) {
    redirect('/permanences')
  }

  const sections = [
    { key: 'communication', name: 'Communication', desc: 'Email élus, publications réseaux sociaux, presse.' },
    { key: 'phoning', name: 'Phoning Électeurs', desc: 'Appels et invitations ciblées depuis le CRM.' },
    { key: 'courrier', name: 'Courrier Postal', desc: 'Envois physiques aux contacts sans adresse email.' },
    { key: 'commercants', name: 'Commerçants', desc: 'Attitudes et visites prévues lors de la permanence.' },
    { key: 'institutionnel', name: 'Institutionnel & Presse', desc: 'Convocations mairies et communiqués de presse.' },
    { key: 'logistique', name: 'Logistique & Accès', desc: 'Réservation de parking, matériel, accès aux lieux.' }
  ]

  // Calculate completion per section
  const sectionStats = sections.map(sec => {
    const secTasks = permanence.tasks.filter(t => t.section === sec.key)
    const total = secTasks.length
    const done = secTasks.filter(t => t.status === 'DONE').length
    const completion = total === 0 ? 100 : Math.round((done / total) * 100)
    return {
      ...sec,
      total,
      done,
      completion
    }
  })

  // Check required uncompleted tasks (blockages)
  const uncompletedRequired = permanence.tasks.filter(t => t.required && t.status !== 'DONE')

  const getScoreColor = (score: number) => {
    if (score < 50) return 'var(--danger)'
    if (score < 80) return 'var(--warning)'
    return 'var(--success)'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Brouillon'
      case 'IN_PROGRESS': return 'En préparation'
      case 'TO_CORRECT': return 'À corriger'
      case 'READY': return 'Prête'
      case 'VALIDATED': return 'Validée'
      case 'ARCHIVED': return 'Archivée'
      default: return status
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DRAFT': return { backgroundColor: '#e2e8f0', color: '#475569' }
      case 'IN_PROGRESS': return { backgroundColor: '#dbeafe', color: '#1e40af' }
      case 'TO_CORRECT': return { backgroundColor: '#fee2e2', color: '#991b1b' }
      case 'READY': return { backgroundColor: '#fef3c7', color: '#92400e' }
      case 'VALIDATED': return { backgroundColor: '#d1fae5', color: '#065f46' }
      case 'ARCHIVED': return { backgroundColor: '#f3f4f6', color: '#374151' }
      default: return { backgroundColor: '#e2e8f0', color: '#475569' }
    }
  }

  const hasValidatePermission = session.permissions.includes('permanences.validate') || session.role === 'SUPERADMIN'
  const isAdminOrSuper = session.role === 'ADMIN' || session.role === 'SUPERADMIN'
  const isReadOnly = session.role === 'READONLY'

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* BREADCRUMB */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/permanences" className="text-blue-600 hover:underline">Permanences</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--text-muted)' }}>{permanence.title}</span>
      </div>

      {/* HEADER */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{permanence.title}</h1>
              <span style={{ 
                padding: '0.3rem 0.8rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                ...getStatusStyle(permanence.status)
              }}>
                {getStatusLabel(permanence.status)}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} />
                {new Date(permanence.scheduledStartDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={16} />
                Responsable : {permanence.ownerUser.name}
              </div>
              {permanence.locations.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} />
                  Lieu : {permanence.locations.map(l => l.communeName).join(', ')}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {session.permissions.includes('permanences.export') && (
              <a href={`/api/export/permanences?id=${permanence.id}`} className="button outline" style={{ height: '40px' }}>
                <FileSpreadsheet size={16} /> Exporter XLSX
              </a>
            )}
            {!isReadOnly && (
              <Link href={`/permanences/${permanence.id}/edit`} className="button outline" style={{ height: '40px' }}>
                Modifier
              </Link>
            )}
          </div>
        </div>

        {permanence.validationComment && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fffbeb', borderLeft: '4px solid #d97706', borderRadius: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '0.875rem' }}>Commentaire de validation :</span>
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#78350f' }}>{permanence.validationComment}</p>
          </div>
        )}
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '2rem' }}>
        {/* SCORE JAUGE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Score de Préparation</h3>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            border: `12px solid #e2e8f0`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: getScoreColor(permanence.score) }}>
              {permanence.score}%
            </span>
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: getScoreColor(permanence.score) }}>
            {permanence.score < 50 ? 'Préparation insuffisante' : permanence.score < 80 ? 'En bonne voie' : 'Prêt pour validation'}
          </span>
        </div>

        {/* WORKFLOW ACTIONS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1rem' }}>Workflow & Actions</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Soumettez la permanence une fois prête. Le député validera ou renverra pour correction.
            </p>
          </div>
          <WorkflowButtons 
            permanenceId={permanence.id} 
            currentStatus={permanence.status} 
            score={permanence.score}
            hasBlockages={uncompletedRequired.length > 0}
            hasValidatePermission={hasValidatePermission}
            isAdminOrSuper={isAdminOrSuper}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* BLOCKAGES (REQUIRED TASKS ALERTS) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1rem' }}>
            <AlertTriangle size={18} className={uncompletedRequired.length > 0 ? "text-red-500" : "text-green-500"} />
            Points de Blocage ({uncompletedRequired.length})
          </h3>
          {uncompletedRequired.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.875rem', height: '100px' }}>
              <CheckCircle2 size={16} /> Aucun point de blocage. Toutes les tâches obligatoires sont faites !
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uncompletedRequired.map(t => (
                <li key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8125rem', padding: '0.4rem', backgroundColor: '#fee2e2', borderRadius: '4px', color: '#991b1b' }}>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem', backgroundColor: '#fca5a5', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                    {t.section}
                  </span>
                  <span>{t.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SECTIONS GRID */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '1rem' }}>Préparation par Section</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sectionStats.map(sec => (
            <Link key={sec.key} href={`/permanences/${permanence.id}/${sec.key}`} className="card" style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: 'bold', color: 'var(--foreground)' }}>{sec.name}</h4>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: getScoreColor(sec.completion) }}>
                    {sec.completion}%
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{sec.desc}</p>
              </div>

              <div>
                <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ width: `${sec.completion}%`, height: '100%', backgroundColor: getScoreColor(sec.completion), borderRadius: '2px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{sec.done} / {sec.total} tâches</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Préparer <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* SYNTHESE DEPUTE LINK */}
          <Link href={`/permanences/${permanence.id}/synthese`} className="card" style={{ 
            padding: '1.5rem', 
            gridColumn: 'span 1',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            border: '2px dashed var(--primary)',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Synthèse Député</h4>
                {permanence.synthesis?.signedAt ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#d1fae5', color: '#065f46', padding: '0.1rem 0.5rem', borderRadius: '9999px' }}>
                    Signée
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.5rem', borderRadius: '9999px' }}>
                    À signer
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Fiche récapitulative destinée à Lionel Tivoli, regroupant les points d\'attention, commerces recommandés et contacts phoning signalés.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              <span>Synthèse d\'activité</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', color: 'var(--primary)', fontWeight: 600 }}>
                Consulter <ChevronRight size={12} />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
