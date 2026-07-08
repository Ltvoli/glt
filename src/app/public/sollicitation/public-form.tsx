'use client'

import { useState } from 'react'
import { submitPublicSollicitation } from './actions'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, MapPin, Send, CheckCircle2, User, Globe } from 'lucide-react'

export default function PublicForm() {
  const [civility, setCivility] = useState('Autre')
  const [type, setType] = useState('SOLLICITATION')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('civility', civility)
    formData.set('type', type)

    try {
      const res = await submitPublicSollicitation(formData)
      if (res.success) {
        setSuccess(true)
        toast.success('Votre demande a été envoyée avec succès !')
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
          Merci pour votre message !
        </h2>
        <p style={{
          color: '#64748b',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          {type === 'SOLLICITATION' 
            ? 'Votre demande de sollicitation a bien été transmise à notre secrétariat parlementaire. Une tâche de suivi a été ouverte et nous prendrons contact avec vous dans les meilleurs délais.'
            : 'Votre inscription à notre lettre d\'information (newsletter) a bien été prise en compte.'
          }
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
          Envoyer un autre message
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

      {/* Type Section Tab Selector */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '2rem'
      }}>
        <button
          type="button"
          onClick={() => setType('SOLLICITATION')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: 'none',
            background: type === 'SOLLICITATION' ? 'white' : 'transparent',
            color: type === 'SOLLICITATION' ? '#0f172a' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: type === 'SOLLICITATION' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Demande d'intervention / RDV
        </button>
        <button
          type="button"
          onClick={() => setType('NEWSLETTER')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: 'none',
            background: type === 'NEWSLETTER' ? 'white' : 'transparent',
            color: type === 'NEWSLETTER' ? '#0f172a' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: type === 'NEWSLETTER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Inscription Lettre d'Info (Newsletter)
        </button>
      </div>

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
            Adresse E-mail {type === 'NEWSLETTER' && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="email"
              name="email"
              type="email"
              required={type === 'NEWSLETTER'}
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
            Téléphone Portable
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
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
        Votre Adresse (Optionnel, recommandé pour cibler votre commune)
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

      {/* Message Section (only visible for SOLLICITATION) */}
      {type === 'SOLLICITATION' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
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
            Détails de votre Demande
          </h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="subject" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Objet de la demande <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required={type === 'SOLLICITATION'}
              className="form-control"
              placeholder="Ex: Problème d'aménagement local, demande de rendez-vous..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '0.35rem' }}>
              Message / Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required={type === 'SOLLICITATION'}
              rows={4}
              className="form-control"
              placeholder="Décrivez votre situation ou votre demande..."
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
      )}

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
            J'accepte que mes données soient traitées par le cabinet parlementaire de Lionel Tivoli, conformément à la politique de confidentialité, afin de traiter ma demande et de recevoir des communications locales. <span style={{ color: '#ef4444' }}>*</span>
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
            Envoi en cours...
          </>
        ) : (
          <>
            <Send size={18} />
            {type === 'SOLLICITATION' ? 'Envoyer ma sollicitation' : "M'inscrire à la newsletter"}
          </>
        )}
      </button>
    </form>
  )
}
