import PublicForm from './public-form'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Formulaire de Contact & Sollicitation - Cabinet Parlementaire',
  description: 'Soumettez vos demandes d\'intervention ou sollicitations citoyennes directement à l\'équipe de Lionel Tivoli, député de la circonscription.',
}

export default function PublicSollicitationPage() {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, #f0fdf4 0%, #f8fafc 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '650px',
        width: '100%',
        margin: '0 auto 2rem auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.25rem',
          color: '#0f172a',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-lexend)'
        }}>
          BP-Lionel Tivoli
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#64748b',
          fontWeight: 500,
          fontFamily: 'var(--font-source-sans)'
        }}>
          Espace Citoyen de Contact & Sollicitation
        </p>
      </div>

      {/* Main Form container */}
      <div style={{ flex: 1 }}>
        <PublicForm />
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '650px',
        width: '100%',
        margin: '2rem auto 0 auto',
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
