'use client'

import { useState } from 'react'
import { submitPublicSollicitation } from '@/app/public/sollicitation/actions'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, MapPin, Send, CheckCircle2, User, Globe } from 'lucide-react'

export default function PublicPermanenceForm({ permanenceId, permanenceTitle }: { permanenceId: string, permanenceTitle: string }) {
  const [civility, setCivility] = useState('Autre')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('civility', civility)
    formData.set('type', 'SOLLICITATION')
    formData.set('permanenceId', permanenceId)
    formData.set('subject', `Rendez-vous Permanence Mobile : ${permanenceTitle}`)

    try {
      const res = await submitPublicSollicitation(formData)
      if (res.success) {
        setSuccess(true)
        toast.success('Votre demande de rendez-vous a bien été enregistrée !')
      } else {
        toast.error(res.error || 'Une erreur est survenue.')
      }
    } catch (err) {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem 2rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
        maxWidth: '550px',
        width: '100%',
        margin: '0 auto',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#ecfdf5',
          color: '#10b981',
          marginBottom: '1.5rem'
        }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{
          fontSize: '1.8rem',
          color: '#0f172a',
          fontWeight: 700,
          marginBottom: '1rem',
          fontFamily: 'var(--font-lexend)'
        }}>
          Rendez-vous Enregistré !
        </h2>
        <p style={{
          color: '#64748b',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          Votre demande de rendez-vous pour la permanence mobile <strong>{permanenceTitle}</strong> a bien été transmise à notre secrétariat. Votre fiche citoyen et votre demande ont été transmises à l'équipe parlementaire.
        </p>
        <button
          onClick={() => setSuccess(false)}
          style={{
            background: 'var(--primary, #0369a1)',
            color: 'white',
            padding: '0.75rem 2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(3, 105, 161, 0.2)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--primary-hover, #075985)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--primary, #0369a1)'
            e.currentTarget.style.transform = 'none'
          }}
        >
          Modifier ou renvoyer une demande
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'white',
      borderRadius: '16px',
      padding: '2.5rem',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      maxWidth: '650px',
      width: '100%',
      margin: '0 auto',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h3 style={{
        fontSize: '1.25rem',
        color: '#0f172a',
        fontWeight: 700,
        marginBottom: '1.5rem',
        textAlign: 'center',
        fontFamily: 'var(--font-lexend)'
      }}>
        Demander un rendez-vous lors de cette permanence
      </h3>

      {/* Identity Details */}
      <h3 style={{
        fontSize: '1.1rem',
        color: '#0f172a',
        fontWeight: 600,
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '0.5rem'
      }}>
        <User size={18} style={{ color: 'var(--primary)' }} />
        Votre Identité
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Civilité
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['H', 'F', 'Autre'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCivility(c)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: civility === c ? 'var(--primary)' : '#cbd5e1',
                  background: civility === c ? 'var(--primary-light)' : 'white',
                  color: civility === c ? 'var(--primary)' : '#475569',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {c === 'H' ? 'Monsieur' : c === 'F' ? 'Madame' : 'Autre'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="firstName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Prénom <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="form-control"
            placeholder="Ex: Jean"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div>
          <label htmlFor="lastName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Nom <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="form-control"
            placeholder="Ex: Dupont"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      {/* Contact Details */}
      <h3 style={{
        fontSize: '1.1rem',
        color: '#0f172a',
        fontWeight: 600,
        marginTop: '2rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '0.5rem'
      }}>
        <Mail size={18} style={{ color: 'var(--primary)' }} />
        Coordonnées de Contact
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Adresse E-mail
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="email"
              name="email"
              type="email"
              className="form-control"
              placeholder="Ex: jean.dupont@email.com"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="mobilePhone" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Téléphone Portable <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
              required
              className="form-control"
              placeholder="Ex: 06 12 34 56 78"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Address Details */}
      <h3 style={{
        fontSize: '1.1rem',
        color: '#0f172a',
        fontWeight: 600,
        marginTop: '2rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '0.5rem'
      }}>
        <MapPin size={18} style={{ color: 'var(--primary)' }} />
        Votre Adresse
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label htmlFor="streetNumber" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            N° de rue
          </label>
          <input
            id="streetNumber"
            name="streetNumber"
            type="text"
            className="form-control"
            placeholder="Ex: 12 bis"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div>
          <label htmlFor="streetName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Libellé de la voie / rue
          </label>
          <input
            id="streetName"
            name="streetName"
            type="text"
            className="form-control"
            placeholder="Ex: Grande Rue"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label htmlFor="postalCode" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Code Postal
          </label>
          <input
            id="postalCode"
            name="postalCode"
            type="text"
            className="form-control"
            placeholder="Ex: 06600"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div>
          <label htmlFor="city" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Commune / Ville
          </label>
          <input
            id="city"
            name="city"
            type="text"
            className="form-control"
            placeholder="Ex: Antibes"
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      {/* Message Section */}
      <div>
        <h3 style={{
          fontSize: '1.1rem',
          color: '#0f172a',
          fontWeight: 600,
          marginTop: '2rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.5rem'
        }}>
          <Globe style={{ color: 'var(--primary)' }} size={18} />
          Sujet que vous souhaitez aborder
        </h3>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
            Description de votre demande / dossier <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            className="form-control"
            placeholder="Décrivez brièvement le sujet que vous souhaitez aborder avec le député ou ses collaborateurs lors de la permanence..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* RGPD Consent */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem'
      }}>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            required
            style={{ marginTop: '0.2rem', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
            J'accepte que mes données soient traitées par le cabinet parlementaire de Lionel Tivoli afin d'enregistrer ma participation et d'être contacté pour cette permanence. <span style={{ color: '#ef4444' }}>*</span>
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          background: 'var(--primary, #0369a1)',
          color: 'white',
          padding: '0.85rem',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(3, 105, 161, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.background = 'var(--primary-hover, #075985)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={e => {
          if (!loading) {
            e.currentTarget.style.background = 'var(--primary, #0369a1)'
            e.currentTarget.style.transform = 'none'
          }
        }}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Enregistrement en cours...
          </>
        ) : (
          <>
            <Send size={18} />
            Confirmer ma demande de RDV
          </>
        )}
      </button>
    </form>
  )
}
