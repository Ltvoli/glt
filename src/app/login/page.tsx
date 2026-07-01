import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'
import { Building2 } from 'lucide-react'

export const metadata = {
  title: 'Connexion — Bureau Parlementaire',
  description: 'Accédez à votre espace de gestion parlementaire.',
}

export default async function LoginPage() {
  const session = await getSession()
  if (session?.userId) redirect('/')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    }}>
      {/* ── Left Panel — Brand ───────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-100px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <Building2 size={24} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
                Bureau Parlementaire
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                Député Lionel Tivoli
              </div>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            color: 'white',
            fontSize: '2.5rem',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
          }}>
            Gérez votre bureau<br />
            <span style={{ color: '#93c5fd' }}>parlementaire</span><br />
            efficacement.
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '1rem',
            lineHeight: 1.7,
            maxWidth: '380px',
          }}>
            Contacts citoyens, courriers, questions écrites,
            planning et permanences — tout en un seul espace sécurisé.
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: '2rem', marginTop: '2.5rem',
          }}>
            {[
              { value: '100%', label: 'Données sécurisées' },
              { value: 'RGPD', label: 'Conforme' },
              { value: '2FA', label: 'Authentification' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ color: '#93c5fd', fontWeight: 800, fontSize: '1.25rem' }}>{value}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Bureau Parlementaire — Tous droits réservés
        </div>
      </div>

      {/* ── Right Panel — Form ───────────────────────────── */}
      <div style={{
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}>
              Connexion
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Bienvenue. Entrez vos identifiants pour accéder à votre espace.
            </p>
          </div>

          <LoginForm />

          <p style={{
            textAlign: 'center',
            marginTop: '2rem',
            fontSize: '0.78rem',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <span>
              Accès administrateur ?{' '}
              <a href="/admin-login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                Panneau admin →
              </a>
            </span>
            <a href="/cgu-privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>
              CGU & Politique de Confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
