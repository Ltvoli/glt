import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import SuperAdminLoginForm from './login-form'
import { Shield, Lock, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Administration — Connexion sécurisée',
  robots: 'noindex, nofollow',  // Don't index this page
}

export default async function AdminLoginPage() {
  // If already logged in as admin, redirect directly
  const session = await getSession()
  if (session?.role === 'SUPERADMIN') {
    redirect('/admin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top left, #0f1e3d 0%, #080e1e 60%, #000510 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(37, 99, 235, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glow effects */}
      <div style={{
        position: 'absolute', top: '-150px', left: '-150px', zIndex: 0,
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-150px', right: '-150px', zIndex: 0,
        width: '400px', height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {/* Logo / Shield icon */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
            marginBottom: '1.5rem',
          }}>
            <Shield size={34} color="white" strokeWidth={1.5} />
          </div>

          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#f1f5f9',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Panneau d'administration
          </h1>
          <p style={{
            fontSize: '0.83rem',
            color: '#475569',
            margin: 0,
          }}>
            Bureau parlementaire — Accès restreint
          </p>
        </div>

        {/* Warning banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'rgba(234, 179, 8, 0.06)',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          borderRadius: '8px',
          marginBottom: '1.75rem',
        }}>
          <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <p style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Zone sécurisée. Toutes les tentatives de connexion sont enregistrées et auditées.
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(37, 99, 235, 0.15)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
        }}>
          <SuperAdminLoginForm />
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: '#1e3a5f',
          fontSize: '0.75rem',
        }}>
          <Lock size={11} />
          <span>Connexion chiffrée HTTPS · Session 8h · 2FA obligatoire</span>
        </div>
      </div>
    </div>
  )
}
