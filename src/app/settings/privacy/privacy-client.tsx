'use client'

import React, { useState, useTransition } from 'react'
import { exportUserDataAction, anonymizeAccountAction } from '../actions'
import { Check, X, Loader2, Download, Trash2, EyeOff, AlertTriangle } from 'lucide-react'

type PrivacyClientProps = {
  userEmail: string
  userName: string
}

export default function PrivacyClient({ userEmail, userName }: PrivacyClientProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  
  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  // 1. Trigger JSON Data Export
  const handleExportData = () => {
    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await exportUserDataAction()
      if (res.success && res.data) {
        const jsonString = JSON.stringify(res.data, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `cdc_export_donnees_${userName.replace(/\s+/g, '_').toLowerCase()}.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setSuccessBanner('Vos données personnelles ont été exportées avec succès.')
      } else {
        setErrorBanner(res.error || 'Erreur lors de la génération de l\'export.')
      }
    })
  }

  // 2. Trigger Account Anonymization (Annihilation)
  const handleAnonymize = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setErrorBanner('L\'adresse email saisie ne correspond pas à votre compte.')
      return
    }

    if (!confirm('Attention : Cette action est irréversible. Votre compte sera définitivement anonymisé, vos sessions détruites et vous serez immédiatement déconnecté. Confirmer ?')) {
      return
    }

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await anonymizeAccountAction()
      if (res.success) {
        setSuccessBanner('Votre compte a été anonymisé et désactivé. Redirection vers la page de connexion...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2500)
      } else {
        setErrorBanner(res.error || 'Erreur lors de la suppression de votre compte.')
      }
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column: Data Export (GDPR Portability) */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} style={{ color: 'var(--primary)' }} />
          Portabilité des données (RGPD)
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous pouvez télécharger une copie complète de toutes les informations personnelles collectées et rattachées à votre compte utilisateur sur cette plateforme.
        </p>

        {successBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
            <Check size={18} /> {successBanner}
          </div>
        )}

        <button
          onClick={handleExportData}
          disabled={isPending}
          className="button outline"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '40px' }}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Télécharger mes données (Format JSON)
        </button>
      </div>

      {/* Right Column: Account deletion / Anonymization */}
      <div className="card" style={{ padding: '2rem', border: '1px solid #fecaca' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={18} />
          Zone de danger : Supprimer mon compte
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
          En supprimant votre compte, vos données personnelles seront définitivement anonymisées (remplacement de vos noms, prénoms et adresse email par des valeurs neutres conformément aux obligations RGPD). Vos contributions passées (fiches créées, notes de contact) seront conservées mais associées à un utilisateur anonyme.
        </p>

        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          padding: '0.75rem', 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fef3c7', 
          borderRadius: '6px',
          color: '#b45309',
          fontSize: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Attention :</strong> Cette action est définitive. Vous perdrez immédiatement vos accès et ne pourrez plus jamais vous connecter.
          </span>
        </div>

        {errorBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
            <X size={18} /> {errorBanner}
          </div>
        )}

        <form onSubmit={handleAnonymize} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
              Pour confirmer, veuillez saisir votre adresse email (<span style={{ fontFamily: 'monospace' }}>{userEmail}</span>) :
            </label>
            <input
              type="email"
              className="form-control"
              required
              placeholder={userEmail}
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()}
            className="button danger"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '40px', opacity: confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase() ? 0.6 : 1 }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Supprimer et anonymiser définitivement
          </button>
        </form>
      </div>

    </div>
  )
}
