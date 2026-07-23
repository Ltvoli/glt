'use client'

import { useState } from 'react'
import { X, Save, User, MapPin, Building, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface QuickContactDrawerProps {
  contact: any
  isOpen: boolean
  onClose: () => void
  onContactUpdated?: () => void
}

export default function QuickContactDrawer({
  contact,
  isOpen,
  onClose,
  onContactUpdated
}: QuickContactDrawerProps) {
  const [firstName, setFirstName] = useState(contact?.firstName || '')
  const [lastName, setLastName] = useState(contact?.lastName || '')
  const [title, setTitle] = useState(contact?.title || '')
  const [organization, setOrganization] = useState(contact?.organization || '')
  const [address, setAddress] = useState(contact?.address || '')
  const [postalCode, setPostalCode] = useState(contact?.postalCode || '')
  const [city, setCity] = useState(contact?.city || '')
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  if (!isOpen || !contact) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const toastId = toast.loading("Mise à jour de la fiche contact CRM...")
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          title,
          organization,
          address,
          postalCode,
          city
        })
      })

      if (!res.ok) throw new Error("Erreur de sauvegarde")

      toast.success("Fiche Contact mise à jour avec succès !", { id: toastId })
      onContactUpdated?.()
      onClose()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Impossible de mettre à jour le contact", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
      backgroundColor: 'white', zIndex: 120, boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.15)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #e2e8f0'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: '8px', color: '#0369a1' }}>
            <User size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Compléter le Contact CRM</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {contact.firstName} {contact.lastName}
            </p>
          </div>
        </div>

        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
            Titre / Fonction (ex: Monsieur le Maire)
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Monsieur le Maire, Madame la Présidente..."
            style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
            Organisation / Structure
          </label>
          <input
            type="text"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            placeholder="Ex: Mairie, Association, Entreprise..."
            style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
            Adresse postale
          </label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
            placeholder="Ex: 12 Rue de la République..."
            style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
              Code Postal
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              placeholder="75000"
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
              Ville
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Paris"
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onClose} className="button outline">
            Annuler
          </button>
          <button type="submit" disabled={isSaving} className="button primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer le contact
          </button>
        </div>
      </form>
    </div>
  )
}
