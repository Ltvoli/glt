'use client'

import { useActionState, useEffect, useState } from 'react'
import { loginAction } from '@/lib/auth-actions'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, LogIn, KeyRound } from 'lucide-react'

const initialState = { error: '', success: false }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction as any, initialState)
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)

  useEffect(() => {
    if (state.success) router.push('/')
    if ((state as any).data?.requires2FA) setShow2FA(true)
  }, [state, router])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#0f172a',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* Email */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="votre@email.fr"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #3b82f620' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Password */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
          Mot de passe
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            style={{ ...inputStyle, paddingRight: '3rem' }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #3b82f620' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {/* 2FA code — shown only when required */}
      {show2FA && (
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
            <KeyRound size={14} /> Code 2FA
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            placeholder="000 000"
            style={{
              ...inputStyle,
              textAlign: 'center',
              fontSize: '1.4rem',
              letterSpacing: '0.35em',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px #3b82f620' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', textAlign: 'center' }}>
            Entrez le code à 6 chiffres de votre application d'authentification
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div style={{
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠</span> {state.error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          width: '100%',
          padding: '0.8rem',
          background: isPending ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.92rem',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.15s',
          marginTop: '0.25rem',
          letterSpacing: '0.01em',
        }}
      >
        {isPending
          ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Connexion...</>
          : <><LogIn size={17} /> Se connecter</>
        }
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}
