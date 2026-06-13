'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { superAdminLoginAction, type SuperAdminLoginResult } from './actions'
import { Eye, EyeOff, ShieldAlert, Loader2, KeyRound, Lock } from 'lucide-react'

const initialState: SuperAdminLoginResult = { success: false }

export default function SuperAdminLoginForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(superAdminLoginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [savedEmail, setSavedEmail] = useState('')
  const [savedPassword, setSavedPassword] = useState('')

  const emailRef    = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.success) {
      router.push('/admin')
    }
    if (state.requires2FA) {
      setStep('2fa')
      if (state.email) setSavedEmail(state.email)
    }
  }, [state.success, state.requires2FA, state.email, router])

  // When user clicks "Accéder au panneau", save credentials before submitting
  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (step === 'credentials') {
      const email    = emailRef.current?.value    || ''
      const password = passwordRef.current?.value || ''
      setSavedEmail(email)
      setSavedPassword(password)
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleCredentialsSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* ── STEP 1 — Credentials ─────────────────────────── */}
      {step === 'credentials' ? (
        <>
          {/* Email */}
          <div>
            <label style={labelStyle}>Adresse email</label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@bureau-tivoli.fr"
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={e  => Object.assign(e.target.style, inputStyle)}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                style={{ ...inputStyle, paddingRight: '3rem' }}
                onFocus={e => Object.assign(e.target.style, { ...inputFocusStyle, paddingRight: '3rem' })}
                onBlur={e  => Object.assign(e.target.style, { ...inputStyle,      paddingRight: '3rem' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── STEP 2 — 2FA code ─────────────────────────── */
        <>
          {/* Transmit saved credentials as hidden fields */}
          <input type="hidden" name="email"    value={savedEmail}    />
          <input type="hidden" name="password" value={savedPassword} />

          <div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.75rem', marginBottom: '1rem',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={24} color="white" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                  Double authentification
                </p>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                  Entrez le code à 6 chiffres de votre application TOTP
                </p>
              </div>
            </div>

            <label style={labelStyle}>Code de vérification</label>
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
                fontSize: '1.5rem',
                letterSpacing: '0.4em',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
              onFocus={e => Object.assign(e.target.style, {
                ...inputFocusStyle,
                textAlign: 'center', fontSize: '1.5rem',
                letterSpacing: '0.4em', fontFamily: 'monospace', fontWeight: '700',
              })}
              onBlur={e => Object.assign(e.target.style, {
                ...inputStyle,
                textAlign: 'center', fontSize: '1.5rem',
                letterSpacing: '0.4em', fontFamily: 'monospace', fontWeight: '700',
              })}
            />
          </div>
        </>
      )}

      {/* ── Error messages ─────────────────────────────────── */}
      {state.error && !state.requires2FA && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          padding: '10px 14px',
          background: '#ff000015', border: '1px solid #ff000040',
          borderRadius: '8px', color: '#fca5a5', fontSize: '0.83rem',
        }}>
          <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{state.error}</span>
        </div>
      )}
      {state.error && state.requires2FA && (
        <div style={{
          padding: '8px 12px',
          background: '#ff000015', border: '1px solid #ff000040',
          borderRadius: '6px', color: '#fca5a5', fontSize: '0.82rem', textAlign: 'center',
        }}>
          {state.error}
        </div>
      )}

      {/* ── Submit button ───────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          width: '100%', padding: '0.8rem',
          background: isPending ? '#1e3a5f' : 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          color: 'white', border: 'none', borderRadius: '8px',
          fontWeight: 700, fontSize: '0.9rem',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          letterSpacing: '0.02em', transition: 'opacity 0.15s',
          opacity: isPending ? 0.7 : 1, marginTop: '0.25rem',
        }}
      >
        {isPending ? (
          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Vérification…</>
        ) : step === '2fa' ? (
          <><KeyRound size={16} /> Valider le code</>
        ) : (
          <><Lock size={16} /> Accéder au panneau</>
        )}
      </button>

      {/* ── Back button (2FA step only) ─────────────────────── */}
      {step === '2fa' && (
        <button
          type="button"
          onClick={() => {
            setStep('credentials')
            setSavedEmail('')
            setSavedPassword('')
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '0.82rem', textDecoration: 'underline',
            textAlign: 'center',
          }}
        >
          ← Retour aux identifiants
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}

// ─── Shared styles ────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  background: '#0f1a2e',
  border: '1px solid #1e3a5f',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid #2563eb',
  boxShadow: '0 0 0 3px #2563eb22',
}
