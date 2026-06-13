'use client'

import { useActionState, useEffect } from 'react'
import { updateContact } from './actions'
import TagSelector from '@/components/ui/tag-selector'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const initialState = {
  error: '',
  success: false
}

export default function EditContactForm({ contact, allTags = [], dictionary = [] }: { contact: any, allTags?: any[], dictionary?: any[] }) {
  const [state, formAction, isPending] = useActionState(updateContact, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success('Contact mis à jour avec succès !')
      router.push(`/contacts/${contact.id}`)
    }
  }, [state, router, contact.id])

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={contact.id} />
        
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations personnelles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="gender">Genre</label>
            <select id="gender" name="gender" className="form-control" defaultValue={contact.gender || ''}>
              <option value="">Non renseigné</option>
              <option value="H">Homme (H)</option>
              <option value="F">Femme (F)</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="birthDate">Date de naissance</label>
            <input 
              type="date" 
              id="birthDate" 
              name="birthDate" 
              className="form-control" 
              defaultValue={contact.birthDate ? new Date(contact.birthDate).toISOString().split('T')[0] : ''} 
            />
          </div>
          <div className="form-group">
            <label htmlFor="firstName">Prénom *</label>
            <input type="text" id="firstName" name="firstName" className="form-control" defaultValue={contact.firstName} required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Nom de naissance *</label>
            <input type="text" id="lastName" name="lastName" className="form-control" defaultValue={contact.lastName} required />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="usageName">Nom d&apos;usage (marital, usuel)</label>
            <input type="text" id="usageName" name="usageName" className="form-control" defaultValue={contact.usageName || ''} placeholder="Optionnel" />
          </div>
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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="apartment">Appartement / Escalier</label>
            <input type="text" id="apartment" name="apartment" className="form-control" defaultValue={contact.apartment || ''} placeholder="Ex: Appt 12, Esc B" />
          </div>
          <div className="form-group">
            <label htmlFor="building">Bâtiment / Résidence</label>
            <input type="text" id="building" name="building" className="form-control" defaultValue={contact.building || ''} placeholder="Ex: Résidence Les Fleurs" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="streetNumber">Numéro</label>
            <input type="text" id="streetNumber" name="streetNumber" className="form-control" defaultValue={contact.streetNumber || ''} />
          </div>
          <div className="form-group">
            <label htmlFor="streetName">Rue / Voie</label>
            <input type="text" id="streetName" name="streetName" className="form-control" defaultValue={contact.streetName || ''} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="addressComplement">Complément d&apos;adresse (Lieu-dit, BP...)</label>
          <input type="text" id="addressComplement" name="addressComplement" className="form-control" defaultValue={contact.addressComplement || ''} placeholder="Ex: Lieu-dit Les Oliviers" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label htmlFor="postalCode">Code postal</label>
            <input type="text" id="postalCode" name="postalCode" className="form-control" defaultValue={contact.postalCode || ''} />
          </div>
          <div className="form-group">
            <label htmlFor="city">Ville</label>
            <input type="text" id="city" name="city" className="form-control" defaultValue={contact.city || ''} />
          </div>
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
            <select id="supportLevel" name="supportLevel" className="form-control" defaultValue={contact.supportLevel || ''}>
              <option value="">Sélectionnez un niveau</option>
              <option value="1">1 - Très défavorable</option>
              <option value="2">2 - Défavorable</option>
              <option value="3">3 - Neutre</option>
              <option value="4">4 - Favorable</option>
              <option value="5">5 - Très favorable</option>
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
