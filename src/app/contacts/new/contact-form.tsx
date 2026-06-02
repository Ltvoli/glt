'use client'

import { useActionState } from 'react'
import { createContact } from '../actions'

const initialState = {
  error: ''
}

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(createContact, initialState)

  return (
    <form action={formAction}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Informations personnelles</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="gender">Genre</label>
          <select id="gender" name="gender" className="form-control" defaultValue="">
            <option value="">Non renseigné</option>
            <option value="H">Homme (H)</option>
            <option value="F">Femme (F)</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="birthDate">Date de naissance</label>
          <input type="date" id="birthDate" name="birthDate" className="form-control" />
        </div>
        <div className="form-group">
          <label htmlFor="firstName">Prénom *</label>
          <input type="text" id="firstName" name="firstName" className="form-control" required />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Nom *</label>
          <input type="text" id="lastName" name="lastName" className="form-control" required />
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Coordonnées</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" className="form-control" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="mobilePhone">Portable</label>
            <input type="tel" id="mobilePhone" name="mobilePhone" className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Téléphone fixe</label>
            <input type="tel" id="phone" name="phone" className="form-control" />
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Adresse</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="streetNumber">Numéro</label>
          <input type="text" id="streetNumber" name="streetNumber" className="form-control" />
        </div>
        <div className="form-group">
          <label htmlFor="streetName">Rue / Voie</label>
          <input type="text" id="streetName" name="streetName" className="form-control" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="postalCode">Code postal</label>
          <input type="text" id="postalCode" name="postalCode" className="form-control" />
        </div>
        <div className="form-group">
          <label htmlFor="city">Ville</label>
          <input type="text" id="city" name="city" className="form-control" />
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Profil</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="type">Type de contact *</label>
          <select id="type" name="type" className="form-control" required defaultValue="ELECTEUR">
            <option value="ELECTEUR">Électeur</option>
            <option value="ELU">Élu</option>
            <option value="ASSO">Association</option>
            <option value="PARTENAIRE">Partenaire</option>
            <option value="PRESSE">Presse</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="supportLevel">Niveau de Soutien</label>
          <select id="supportLevel" name="supportLevel" className="form-control" defaultValue="">
            <option value="">Non évalué</option>
            <option value="1">1 - Hostile</option>
            <option value="2">2 - Indécis penchant hostile</option>
            <option value="3">3 - Indécis / Neutre</option>
            <option value="4">4 - Favorable</option>
            <option value="5">5 - Militant / Très favorable</option>
          </select>
        </div>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer le contact'}
        </button>
      </div>
    </form>
  )
}
