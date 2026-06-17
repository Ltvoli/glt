'use client'

import { useActionState, useEffect } from 'react'
import { updateContact } from './actions'
import TagSelector from '@/components/ui/tag-selector'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { renderContactField } from '../dynamic-contact-fields'

const initialState = {
  error: '',
  success: false
}

export default function EditContactForm({ contact, allTags = [], dictionary = [], fieldConfig = {}, supportLevels = [] }: { contact: any, allTags?: any[], dictionary?: any[], fieldConfig?: Record<string, any>, supportLevels?: any[] }) {
  const [state, formAction, isPending] = useActionState(updateContact, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success('Contact mis à jour avec succès !')
      router.push(`/contacts/${contact.id}`)
    }
  }, [state, router, contact.id])

  const etatCivilFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'État civil' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const adresseFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Adresse' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={contact.id} />
        
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>État civil</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {etatCivilFields.length > 0 ? (
            etatCivilFields.map((f: any) => renderContactField(f.key, f.label, contact, dictionary))
          ) : (
            <p style={{ color: '#94a3b8', gridColumn: '1 / -1' }}>Aucun champ configuré.</p>
          )}
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Coordonnées</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" className="form-control" defaultValue={contact.email || ''} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="mobilePhone">Portable</label>
              <input type="tel" id="mobilePhone" name="mobilePhone" className="form-control" defaultValue={contact.mobilePhone || ''} />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Téléphone fixe</label>
              <input type="tel" id="phone" name="phone" className="form-control" defaultValue={contact.phone || ''} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="linkedinUrl">LinkedIn (URL)</label>
            <input type="url" id="linkedinUrl" name="linkedinUrl" className="form-control" defaultValue={contact.linkedinUrl || ''} placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Adresse</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {adresseFields.length > 0 ? (
            adresseFields.map((f: any) => renderContactField(f.key, f.label, contact, dictionary))
          ) : (
            <p style={{ color: '#94a3b8', gridColumn: '1 / -1' }}>Aucun champ configuré.</p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="territorySector">Secteur / Canton</label>
            <input type="text" id="territorySector" name="territorySector" className="form-control" defaultValue={contact.territorySector || ''} placeholder="Ex: Canton de Grasse-1" />
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Profil</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="type">Type de contact *</label>
            <select id="type" name="type" className="form-control" defaultValue={contact.type} required>
              {dictionary.filter(d => d.type === 'CONTACT_TYPE').map(d => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="supportLevel">Niveau de Soutien</label>
            <select id="supportLevel" name="supportLevel" className="form-control" defaultValue={(() => {
              let defaultSupportLevel = contact.supportLevel || ''
              if (defaultSupportLevel && !supportLevels.some((sl: any) => sl.label === defaultSupportLevel)) {
                const num = parseInt(defaultSupportLevel)
                if (!isNaN(num) && num >= 1 && num <= 5 && supportLevels.length > 0) {
                  const idx = Math.round(((num - 1) / 4) * (supportLevels.length - 1))
                  defaultSupportLevel = supportLevels[Math.min(idx, supportLevels.length - 1)].label
                }
              }
              return defaultSupportLevel
            })()}>
              <option value="">Sélectionnez un niveau</option>
              {supportLevels.map((sl: any) => (
                <option key={sl.id} value={sl.label}>{sl.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="meetingStep">Étape de la rencontre</label>
            <select id="meetingStep" name="meetingStep" className="form-control" defaultValue={contact.meetingStep || ''}>
              <option value="">Sélectionnez une étape</option>
              <option value="Absent">Absent</option>
              <option value="Accepté">Accepté</option>
              <option value="Refusé">Refusé</option>
              <option value="Repassés">Repassés</option>
              <option value="Pas encore contactés">Pas encore contactés</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="source">Source d&apos;acquisition</label>
            <select id="source" name="source" className="form-control" defaultValue={contact.source || 'PERMANENCE'}>
              <option value="PERMANENCE">Permanence</option>
              <option value="COURRIER">Courrier</option>
              <option value="EVENEMENT">Événement</option>
              <option value="TERRAIN">Terrain / Porte à porte</option>
              <option value="QOMON">Import Qomon</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="whatsappStatus">Statut WhatsApp</label>
            <select id="whatsappStatus" name="whatsappStatus" className="form-control" defaultValue={contact.whatsappStatus || 'NON'}>
              <option value="NON">Non invité</option>
              <option value="ENVOYE">Invitation envoyée</option>
              <option value="REJOINT">A rejoint le groupe</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="tags">Tags</label>
        <TagSelector 
          allTags={allTags} 
          defaultValue={contact.tags?.map((ct: any) => ct.tag.name).join(', ') || ''} 
          name="tags" 
          placeholder="Ex: Chasseur, Retraité, Buraliste..." 
        />
      </div>

        <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="newsletter" name="newsletter" value="true" defaultChecked={contact.newsletter} />
          <label htmlFor="newsletter" style={{ margin: 0 }}>Abonné à la Newsletter (Consentement RGPD Email validé)</label>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="smsConsent" name="smsConsent" value="true" defaultChecked={contact.smsConsent} />
          <label htmlFor="smsConsent" style={{ margin: 0 }}>Consentement SMS (RGPD validé)</label>
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label htmlFor="notes">Notes internes</label>
          <textarea id="notes" name="notes" className="form-control" rows={4} defaultValue={contact.notes || ''} placeholder="Informations complémentaires, historique de la relation..."></textarea>
        </div>

        {state.error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {state.error}
          </div>
        )}
        
        {state.success && (
          <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Contact mis à jour avec succès.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="button" disabled={isPending}>
            {isPending ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </div>
  )
}
