import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicPermanenceForm from './public-permanence-form'
import { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Share2 } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null }
  })

  return {
    title: permanence ? `Permanence Mobile : ${permanence.title}` : 'Permanence Mobile',
    description: 'Consultez les horaires de passage et demandez un rendez-vous lors de notre prochaine permanence mobile.',
  }
}

export default async function PublicPermanencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const permanence = await prisma.mobilePermanence.findUnique({
    where: { id, archivedAt: null },
    include: {
      locations: {
        orderBy: { order: 'asc' },
        include: { commune: true }
      }
    }
  })

  // Ne pas afficher publiquement si la permanence n'existe pas ou est en brouillon/archivée
  if (!permanence || permanence.status === 'DRAFT' || permanence.status === 'ARCHIVED') {
    notFound()
  }

  const dateFormatted = permanence.scheduledStartDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #eff6ff 0%, #f8fafc 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '750px',
        width: '100%',
        margin: '0 auto 2rem auto',
        textAlign: 'center'
      }}>
        <span style={{
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--primary, #0369a1)',
          background: '#e0f2fe',
          padding: '0.35rem 0.8rem',
          borderRadius: '50px',
          display: 'inline-block',
          marginBottom: '1rem'
        }}>
          Permanence Parlementaire Mobile 🚌
        </span>
        <h1 style={{
          fontSize: '2.25rem',
          color: '#0f172a',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          marginBottom: '0.75rem',
          fontFamily: 'var(--font-lexend)',
          lineHeight: '1.2'
        }}>
          {permanence.title}
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#475569',
          fontWeight: 500,
          fontFamily: 'var(--font-source-sans)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Calendar size={18} />
          {dateFormatted}
        </p>
      </div>

      <div style={{
        maxWidth: '750px',
        width: '100%',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2rem'
      }}>
        {/* Itinerary Stops */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            color: '#0f172a',
            fontWeight: 700,
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-lexend)',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem'
          }}>
            📍 Itinéraire et Horaires de Passage
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            {permanence.locations.map((loc, idx) => (
              <div key={loc.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                {/* Timeline visual line */}
                {idx < permanence.locations.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '15px',
                    top: '30px',
                    bottom: '-30px',
                    width: '2px',
                    backgroundColor: '#e2e8f0'
                  }} />
                )}
                
                {/* Pin index */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-light, #e0f2fe)',
                  color: 'var(--primary, #0369a1)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                    {loc.communeName || loc.commune?.name}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                      <Clock size={14} />
                      {loc.startTime || '??:??'} - {loc.endTime || '??:??'}
                    </span>
                    {loc.address && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        <MapPin size={14} />
                        {loc.address}
                      </span>
                    )}
                  </div>
                  {loc.locationNotes && (
                    <p style={{ fontSize: '0.875rem', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #cbd5e1' }}>
                      {loc.locationNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div>
          <PublicPermanenceForm permanenceId={permanence.id} permanenceTitle={permanence.title} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '750px',
        width: '100%',
        margin: '3rem auto 0 auto',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#94a3b8'
      }}>
        <p>© {new Date().getFullYear()} Cabinet Parlementaire. Tous droits réservés.</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link 
            href="/cgu-privacy" 
            style={{ color: '#64748b', textDecoration: 'underline' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#334155')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            Mentions Légales & CGU
          </Link>
        </div>
      </div>
    </div>
  )
}
