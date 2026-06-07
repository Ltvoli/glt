'use client'

import { useActionState } from 'react'
import { loginAction } from '@/lib/auth-actions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const initialState = {
  error: '',
  success: false
}

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction as any, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.push('/')
    }
  }, [state.success, router])

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </div>
      
      <div>
        <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </div>

      {state.error && (
        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          marginTop: '1rem',
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: '500',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1
        }}
      >
        {isPending ? 'Connexion en cours...' : 'Se connecter'}
      </button>
    </form>
  )
}
