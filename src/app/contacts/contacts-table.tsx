'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'

type Column = {
  id: string
  label: string
  defaultVisible: boolean
}

const ALL_COLUMNS: Column[] = [
  { id: 'firstName', label: 'Prénom', defaultVisible: true },
  { id: 'lastName', label: 'Nom', defaultVisible: true },
  { id: 'streetNumber', label: 'Numéro', defaultVisible: true },
  { id: 'streetName', label: 'Rue/voie', defaultVisible: true },
  { id: 'postalCode', label: 'Code postal', defaultVisible: true },
  { id: 'city', label: 'Ville', defaultVisible: true },
  { id: 'email', label: 'Email', defaultVisible: true },
  { id: 'phone', label: 'Téléphone fixe', defaultVisible: false },
  { id: 'mobilePhone', label: 'Portable', defaultVisible: true },
  { id: 'birthDate', label: 'Date de naissance', defaultVisible: false },
  { id: 'gender', label: 'Genre', defaultVisible: false },
  { id: 'supportLevel', label: 'Niveau de Soutien', defaultVisible: false },
  { id: 'tags', label: 'Tags', defaultVisible: false },
  { id: 'updatedAt', label: 'Mis à jour le', defaultVisible: false },
  { id: 'createdBy', label: 'Créé par', defaultVisible: false },
  { id: 'updatedBy', label: 'Modifié par', defaultVisible: false },
]

export default function ContactsTable({ contacts }: { contacts: any[] }) {
  const router = useRouter()
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  )
  const [showSettings, setShowSettings] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('contactColumns')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisibleColumns(JSON.parse(saved))
      } catch (e) {
        // Fallback
      }
    }
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('contactColumns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const renderCell = (contact: any, columnId: string) => {
    switch (columnId) {
      case 'firstName': return contact.firstName
      case 'lastName': return contact.lastName
      case 'streetNumber': return contact.streetNumber || '-'
      case 'streetName': return contact.streetName || '-'
      case 'city': return contact.city || '-'
      case 'postalCode': return contact.postalCode || '-'
      case 'email': return contact.email || '-'
      case 'phone': return contact.phone || '-'
      case 'mobilePhone': return contact.mobilePhone || '-'
      case 'birthDate': return contact.birthDate ? new Date(contact.birthDate).toLocaleDateString('fr-FR') : '-'
      case 'gender': return contact.gender || '-'
      case 'supportLevel': return contact.supportLevel ? `Niveau ${contact.supportLevel}` : '-'
      case 'tags': return contact.tags?.map((t: any) => t.tag.name).join(', ') || '-'
      case 'updatedAt': return new Date(contact.updatedAt).toLocaleDateString('fr-FR')
      case 'createdBy': return contact.createdBy?.name || '-'
      case 'updatedBy': return contact.updatedBy?.name || '-'
      default: return '-'
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', position: 'relative' }}>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="button outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Settings size={16} /> Colonnes
        </button>

        {showSettings && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            zIndex: 50,
            width: '300px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem'
          }}>
            {ALL_COLUMNS.map(col => (
              <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={visibleColumns.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ whiteSpace: 'nowrap', width: '100%' }}>
          <thead>
            <tr>
              {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                <th key={col.id}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucun contact trouvé.
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr 
                  key={contact.id} 
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  style={{ cursor: 'pointer' }}
                  className="hoverable-row"
                >
                  {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                    <td key={col.id}>{renderCell(contact, col.id)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Petit style en ligne pour le survol de la ligne */}
      <style dangerouslySetInnerHTML={{__html: `
        .hoverable-row:hover {
          background-color: #f1f5f9;
        }
      `}} />
    </div>
  )
}
