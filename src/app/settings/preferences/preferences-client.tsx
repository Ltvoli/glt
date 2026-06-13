'use client'

import React, { useState, useTransition } from 'react'
import { updatePreferencesAction } from '../actions'
import { Check, X, Loader2, Save, Globe } from 'lucide-react'

type PreferencesClientProps = {
  user: {
    locale: string
    timezone: string
    theme: string
  }
}

const LANGUAGES = [
  { code: 'fr', name: 'Français (French)' },
  { code: 'en', name: 'English (English)' }
]

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
]

const THEMES = [
  { value: 'light', label: 'Mode Clair' },
  { value: 'dark', label: 'Mode Sombre' },
  { value: 'system', label: 'Thème Système' }
]

export default function PreferencesClient({ user }: PreferencesClientProps) {
  const [locale, setLocale] = useState(user.locale || 'fr')
  const [timezone, setTimezone] = useState(user.timezone || 'Europe/Paris')
  const [theme, setTheme] = useState(user.theme || 'light')

  const [isPending, startTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      const res = await updatePreferencesAction(locale, timezone, theme)
      if (res.success) {
        setSuccessBanner('Préférences enregistrées avec succès.')
        
        // Dynamic client-side theme application if they changed it
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark')
        }
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
          <Globe size={18} style={{ color: 'var(--primary)' }} />
          Préférences d'affichage et régionalisation
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Langue de l'interface
            </label>
            <select
              className="form-control"
              value={locale}
              onChange={e => setLocale(e.target.value)}
              style={{ fontSize: '0.9rem' }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Fuseau horaire (Timezone)
            </label>
            <select
              className="form-control"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{ fontSize: '0.9rem' }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Utilisé pour l'affichage correct des dates dans l'agenda, les courriers et les tâches.
            </span>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              Thème graphique
            </label>
            <select
              className="form-control"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              style={{ fontSize: '0.9rem' }}
            >
              {THEMES.map(th => (
                <option key={th.value} value={th.value}>
                  {th.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isPending}
              className="button"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px' }}
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer les préférences
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
