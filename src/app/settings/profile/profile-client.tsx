'use client'

import React, { useState, useTransition } from 'react'
import { updateProfileAction } from '../actions'
import { Check, X, Loader2, Save, User as UserIcon } from 'lucide-react'

type ProfileClientProps = {
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [email, setEmail] = useState(user.email)

  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner('')
    setSuccessBanner('')

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorBanner('Tous les champs sont obligatoires.')
      return
    }

    startTransition(async () => {
      const res = await updateProfileAction(firstName, lastName, email)
      if (res.success) {
        setSuccessBanner('Profil mis à jour avec succès.')
      } else {
        setErrorBanner(res.error || 'Erreur lors de la mise à jour.')
      }
    })
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Alerts */}
      {successBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <Check size={18} /> {successBanner}
        </div>
      )}
      {errorBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <X size={18} /> {errorBanner}
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserIcon size={18} style={{ color: 'var(--primary)' }} />
          Informations du profil
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Prénom
              </label>
              <input
                type="text"
                className="form-control"
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Nom de famille
              </label>
              <input
                type="text"
                className="form-control"
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Adresse Email
            </label>
            <input
              type="email"
              className="form-control"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
              Rôle attribué (Lecture seule)
            </label>
            <input
              type="text"
              className="form-control"
              disabled
              value={user.role}
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Vos droits d'accès sont déterminés par l'administrateur de votre espace de travail.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isPending}
              className="button"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px' }}
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer les modifications
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
