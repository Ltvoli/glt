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

  const getAgeRange = (birthDateString: string): string => {
    if (!birthDateString) return '';
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return '';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) return 'Moins de 18 ans';
    if (age <= 25) return '18-25 ans';
    if (age <= 35) return '26-35 ans';
    if (age <= 50) return '36-50 ans';
    if (age <= 65) return '51-65 ans';
    return 'Plus de 65 ans';
  };

  const handleFormChange = (e: React.FormEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (target.name === 'birthDate') {
      const birthDateVal = target.value;
      const ageRangeSelect = target.form?.elements.namedItem('ageRange') as HTMLSelectElement | null;
      if (ageRangeSelect) {
        ageRangeSelect.value = getAgeRange(birthDateVal);
      }
    }
  };

  return (
    <div>
      <form action={formAction} onChange={handleFormChange}>
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
            <label htmlFor="phone">Téléphone fixe</label>
            <input type="tel" id="phone" name="phone" className="form-control" defaultValue={contact.phone || ''} />
          </div>
          <div className="form-group">
            <label htmlFor="mobilePhone">Mobile</label>
            <input type="tel" id="mobilePhone" name="mobilePhone" className="form-control" defaultValue={contact.mobilePhone || ''} />
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
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="isNpai" name="isNpai" value="true" defaultChecked={contact.isNpai} />
            <label htmlFor="isNpai" style={{ margin: 0, color: 'var(--danger)', fontWeight: 600 }}>NPAI (N&apos;habite pas à l&apos;adresse indiquée)</label>
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Profil</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="type">Type de contact *</label>
            <select id="type" name="type" className="form-control" defaultValue={contact.type} required>
              {dictionary.filter(d => d.type === 'CONTACT_TYPE').length > 0 ? (
                dictionary.filter(d => d.type === 'CONTACT_TYPE').map(d => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))
              ) : (
                <>
                  <option value="ELECTEUR">Électeur</option>
                  <option value="ELU">Élu</option>
                  <option value="CONTACT_MAIRIE">Contact Mairie</option>
                  <option value="ASSO">Association</option>
                  <option value="PARTENAIRE">Partenaire</option>
                  <option value="PRESSE">Presse</option>
                  <option value="AUTRE">Autre</option>
                </>
              )}
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

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Consentements (RGPD)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="consentEmail">Consentement E-mail</label>
            <select id="consentEmail" name="consentEmail" className="form-control" defaultValue={contact.consentEmail === null ? "" : String(contact.consentEmail)}>
              <option value="">Non renseigné</option>
              <option value="true">Consenti (Oui)</option>
              <option value="false">Refusé (Non)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="consentPhone">Consentement Téléphone</label>
            <select id="consentPhone" name="consentPhone" className="form-control" defaultValue={contact.consentPhone === null ? "" : String(contact.consentPhone)}>
              <option value="">Non renseigné</option>
              <option value="true">Consenti (Oui)</option>
              <option value="false">Refusé (Non)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="consentSms">Consentement SMS</label>
            <select id="consentSms" name="consentSms" className="form-control" defaultValue={contact.consentSms === null ? "" : String(contact.consentSms)}>
              <option value="">Non renseigné</option>
              <option value="true">Consenti (Oui)</option>
              <option value="false">Refusé (Non)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="consentPostal">Consentement Postal (Courrier)</label>
            <select id="consentPostal" name="consentPostal" className="form-control" defaultValue={contact.consentPostal === null ? "" : String(contact.consentPostal)}>
              <option value="">Non renseigné</option>
              <option value="true">Consenti (Oui)</option>
              <option value="false">Refusé (Non)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="consentCustom">Consentement Personnalisé</label>
            <select id="consentCustom" name="consentCustom" className="form-control" defaultValue={contact.consentCustom === null ? "" : String(contact.consentCustom)}>
              <option value="">Non renseigné</option>
              <option value="true">Consenti (Oui)</option>
              <option value="false">Refusé (Non)</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" id="noContact" name="noContact" value="true" defaultChecked={contact.noContact} />
            <label htmlFor="noContact" style={{ margin: 0, color: 'var(--danger)', fontWeight: 600 }}>Ne plus jamais contacter (Opposition absolue / Liste rouge)</label>
          </div>
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
