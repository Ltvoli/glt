'use client'

import React, { useState, useTransition } from 'react'
import { 
  generate2FaSecretAction, 
  enable2FaAction, 
  disable2FaAction, 
  revokeSessionAction 
} from '../actions'
import { 
  Check, 
  X, 
  Loader2, 
  ShieldCheck, 
  ShieldAlert,
  Smartphone,
  History,
  Trash2,
  Copy,
  Laptop
} from 'lucide-react'

type Session = {
  id: string
  createdAt: Date
  ip: string | null
  userAgent: string | null
}

type SecurityClientProps = {
  twoFactorEnabled: boolean
  currentSessionId: string
  initialSessions: Session[]
}

export default function SecurityClient({
  twoFactorEnabled: initial2FaEnabled,
  currentSessionId,
  initialSessions
}: SecurityClientProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2FaEnabled)
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  
  // 2FA Setup Flow State
  const [setupMode, setSetupMode] = useState<'none' | 'enable' | 'disable'>('none')
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [tempSecret, setTempSecret] = useState<string | null>(null)
  const [tokenCode, setTokenCode] = useState('')

  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  // 1. Start 2FA Activation Flow
  const handleStartEnable = async () => {
    setErrorBanner('')
    setSuccessBanner('')
    setTokenCode('')
    
    startTransition(async () => {
      const res = await generate2FaSecretAction()
      if (res.success && res.data) {
        setQrCodeUrl(res.data.qrCodeUrl)
        setTempSecret(res.data.secret)
        setSetupMode('enable')
      } else {
        setErrorBanner(res.error || 'Impossible de générer le secret 2FA')
      }
    })
  }

  // 2. Submit 2FA Code to Verify & Enable
  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenCode || !tempSecret) return

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await enable2FaAction(tokenCode, tempSecret)
      if (res.success) {
        setTwoFactorEnabled(true)
        setSetupMode('none')
        setQrCodeUrl(null)
        setTempSecret(null)
        setSuccessBanner('La double authentification (2FA) a été activée sur votre compte.')
      } else {
        setErrorBanner(res.error || 'Le code saisi est invalide.')
      }
    })
  }

  // 3. Submit 2FA Code to Disable
  const handleVerifyAndDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenCode) return

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await disable2FaAction(tokenCode)
      if (res.success) {
        setTwoFactorEnabled(false)
        setSetupMode('none')
        setSuccessBanner('La double authentification (2FA) a été désactivée de votre compte.')
      } else {
        setErrorBanner(res.error || 'Le code saisi est invalide.')
      }
    })
  }

  // 4. Revoke Session
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Voulez-vous vraiment révoquer cette session ? L\'appareil associé sera déconnecté.')) return
    
    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await revokeSessionAction(sessionId)
      if (res.success) {
        setSuccessBanner('Session révoquée avec succès.')
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      } else {
        setErrorBanner(res.error || 'Erreur lors de la révocation.')
      }
    })
  }

  const copySecret = () => {
    if (tempSecret) {
      navigator.clipboard.writeText(tempSecret)
      alert('Clé secrète copiée !')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column: 2FA */}
      <div>
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
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={18} style={{ color: 'var(--primary)' }} />
            Double authentification (2FA)
          </h3>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
            Sécurisez l'accès à votre espace en demandant un code de validation à 6 chiffres généré par une application d'authentification (Google Authenticator, Bitwarden, etc.) lors de la connexion.
          </p>

          {/* Current Status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '1rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {twoFactorEnabled ? (
                <>
                  <ShieldCheck size={20} style={{ color: '#137333' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#137333' }}>Activée</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={20} style={{ color: '#c5221f' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#c5221f' }}>Désactivée</span>
                </>
              )}
            </div>

            {setupMode === 'none' && (
              twoFactorEnabled ? (
                <button
                  onClick={() => {
                    setSetupMode('disable')
                    setTokenCode('')
                    setErrorBanner('')
                    setSuccessBanner('')
                  }}
                  className="button danger outline"
                  style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.85rem' }}
                >
                  Désactiver
                </button>
              ) : (
                <button
                  onClick={handleStartEnable}
                  disabled={isPending}
                  className="button"
                  style={{ height: '32px', padding: '0 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Activer
                </button>
              )
            )}
          </div>

          {/* 2FA Enable Setup Flow */}
          {setupMode === 'enable' && qrCodeUrl && tempSecret && (
            <div style={{ padding: '1.25rem', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '700', color: '#1e40af' }}>
                Configurer l'authentificateur
              </h4>
              
              <ol style={{ fontSize: '0.8rem', color: '#1e40af', paddingLeft: '1.25rem', margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Scannez le code QR ci-dessous avec votre application de sécurité (ex: Google Authenticator).</li>
                <li>
                  Si vous ne pouvez pas scanner, copiez cette clé secrète manuellement : 
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <code style={{ fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #bfdbfe', flex: 1 }}>
                      {tempSecret}
                    </code>
                    <button type="button" onClick={copySecret} className="button outline" style={{ height: '24px', padding: '0 0.35rem', backgroundColor: 'white' }}>
                      <Copy size={12} />
                    </button>
                  </div>
                </li>
                <li>Entrez le code à 6 chiffres généré par votre application pour valider la configuration.</li>
              </ol>

              {/* QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '160px', height: '160px' }} />
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerifyAndEnable} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: 123456"
                  maxLength={6}
                  required
                  value={tokenCode}
                  onChange={e => setTokenCode(e.target.value.replace(/\D/g, ''))}
                  style={{ fontFamily: 'monospace', fontSize: '1rem', height: '36px', textAlign: 'center', letterSpacing: '0.1em' }}
                />
                
                <button
                  type="submit"
                  disabled={isPending || tokenCode.length !== 6}
                  className="button"
                  style={{ height: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Vérifier & Activer
                </button>

                <button
                  type="button"
                  onClick={() => setSetupMode('none')}
                  className="button outline"
                  style={{ height: '36px', backgroundColor: 'white' }}
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

          {/* 2FA Disable Setup Flow */}
          {setupMode === 'disable' && (
            <div style={{ padding: '1.25rem', border: '1px solid #fecaca', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700', color: '#991b1b' }}>
                Désactiver la double authentification
              </h4>
              <p style={{ color: '#991b1b', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                Veuillez saisir le code à 6 chiffres généré par votre application pour confirmer la désactivation.
              </p>

              {/* Verification Form */}
              <form onSubmit={handleVerifyAndDisable} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: 123456"
                  maxLength={6}
                  required
                  value={tokenCode}
                  onChange={e => setTokenCode(e.target.value.replace(/\D/g, ''))}
                  style={{ fontFamily: 'monospace', fontSize: '1rem', height: '36px', textAlign: 'center', letterSpacing: '0.1em' }}
                />
                
                <button
                  type="submit"
                  disabled={isPending || tokenCode.length !== 6}
                  className="button danger"
                  style={{ height: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Désactiver 2FA
                </button>

                <button
                  type="button"
                  onClick={() => setSetupMode('none')}
                  className="button outline"
                  style={{ height: '36px', backgroundColor: 'white' }}
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Right Column: Sessions History */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} style={{ color: 'var(--primary)' }} />
          Sessions actives ({sessions.length})
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
          Voici la liste des navigateurs et des appareils connectés à votre compte. Vous pouvez révoquer une session à tout moment pour la déconnecter.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map(s => {
            const isCurrent = s.id === currentSessionId

            return (
              <div 
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: isCurrent ? '#f0f9ff' : 'white',
                  borderColor: isCurrent ? '#bae6fd' : 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Laptop size={20} style={{ color: isCurrent ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                      {s.userAgent || 'Navigateur inconnu'}
                      {isCurrent && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginLeft: '0.5rem', backgroundColor: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>
                          Session actuelle
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      IP : {s.ip || 'Inconnue'} • Connecté le {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="button danger outline"
                    style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
                    title="Révoquer la session"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
