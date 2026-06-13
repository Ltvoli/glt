'use client'

import React, { useActionState, useEffect } from 'react'
import { acceptInvitationAction } from '@/app/admin/members/actions'
import { useRouter } from 'next/navigation'
import { KeyRound, User, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

type InviteFormProps = {
  token: string
  email: string
}

const initialState = {
  success: false,
  error: ''
}

export default function InviteForm({ token, email }: InviteFormProps) {
  const [state, formAction, isPending] = useActionState(acceptInvitationAction as any, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push('/login?registered=success')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  if (state.success) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          backgroundColor: '#e6f4ea',
          color: '#137333',
          borderRadius: '50%',
          marginBottom: '1rem'
        }}>
          <CheckCircle2 size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          Compte créé avec succès !
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Votre compte est configuré. Vous allez être redirigé vers la page de connexion dans quelques secondes...
        </p>
        <button 
          onClick={() => router.push('/login')} 
          className="button"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          Se connecter maintenant <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <input type="hidden" name="token" value={token} />

      <div className="form-group">
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
          Adresse Email (non modifiable)
        </label>
        <input 
          type="email" 
          className="form-control" 
          value={email} 
          disabled 
          style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor="firstName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
            Prénom
          </label>
          <input 
            id="firstName"
            name="firstName"
            type="text" 
            className="form-control"
            required
            placeholder="Ex: Sophie"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
            Nom
          </label>
          <input 
            id="lastName"
            name="lastName"
            type="text" 
            className="form-control"
            required
            placeholder="Ex: Martin"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
          Mot de passe
        </label>
        <input 
          id="password"
          name="password"
          type="password" 
          className="form-control"
          required
          placeholder="••••••••••••"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
          Doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.
        </span>
      </div>

      {state.error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#fce8e6',
          color: '#c5221f',
          borderRadius: '6px',
          fontSize: '0.85rem',
          border: '1px solid #f5c2c2',
          fontWeight: '500'
        }}>
          <AlertTriangle size={16} />
          {state.error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isPending}
        className="button"
        style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        <KeyRound size={16} />
        {isPending ? 'Création en cours...' : 'Activer mon compte'}
      </button>
    </form>
  )
}
