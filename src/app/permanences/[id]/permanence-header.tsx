'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, FileSpreadsheet, ArrowLeft } from 'lucide-react'

type HeaderProps = {
  permanence: {
    id: string
    title: string
    status: string
    score: number
    scheduledStartDate: string
    returnDate: string | null
    locations: { communeName: string }[]
  }
}

export default function PermanenceHeader({ permanence }: HeaderProps) {
  const pathname = usePathname()

  const tabs = [
    { name: 'Tableau de bord', path: `/permanences/${permanence.id}` },
    { name: 'Mes taches', path: `/permanences/${permanence.id}/mes-taches` },
    { name: 'Identification', path: `/permanences/${permanence.id}/locations` },
    { name: 'Communication', path: `/permanences/${permanence.id}/communication` },
    { name: 'Phoning', path: `/permanences/${permanence.id}/phoning` },
    { name: 'Courrier', path: `/permanences/${permanence.id}/courrier` },
    { name: 'Commerçants', path: `/permanences/${permanence.id}/commercants` },
    { name: 'Institutionnel', path: `/permanences/${permanence.id}/institutionnel` },
    { name: 'Logistique', path: `/permanences/${permanence.id}/logistique` },
    { name: 'Synthese', path: `/permanences/${permanence.id}/synthese` },
    { name: 'Paramètres', path: `/permanences/${permanence.id}/edit` },
  ]

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
      case 'DRAFT': return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' } // Red/Orange Brouillon from screen
      case 'IN_PROGRESS': return { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }
      case 'TO_CORRECT': return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
      case 'READY': return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
      case 'VALIDATED': return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }
      default: return { backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' }
    }
  }

  const isScoreInsufficient = permanence.score < 50
  const communeNames = permanence.locations.map(l => l.communeName).join(', ')
  const formattedDate = new Date(permanence.scheduledStartDate).toISOString().split('T')[0]

  return (
    <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 0 0 0', marginBottom: '1.5rem' }}>
      {/* Back button */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem', marginBottom: '1rem' }}>
        <Link href="/permanences" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Retour à la liste des permanences
        </Link>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Main Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {permanence.title}
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>
                {communeNames || 'Aucune commune'}
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{formattedDate}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{permanence.locations.length} lieu{permanence.locations.length > 1 ? 'x' : ''} de passage</span>
            </p>
          </div>

          {/* Action Badges / Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
              Sauvegarde effectuée
            </span>
            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, ...getStatusStyle(permanence.status) }}>
              {getStatusLabel(permanence.status)}
            </span>
            {isScoreInsufficient && (
              <span style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fecaca', color: '#991b1b', border: '1px solid #fca5a5' }}>
                Insuffisant
              </span>
            )}
            <a href={`/api/export/permanences-csv?id=${permanence.id}`} className="button outline" style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.8rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileSpreadsheet size={14} /> Exporter Excel
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const isActive = pathname === tab.path
            return (
              <Link
                key={tab.path}
                href={tab.path}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? '#0f172a' : 'white',
                  color: isActive ? 'white' : '#475569',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab.name}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
