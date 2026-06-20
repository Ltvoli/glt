'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { addContactToMailList, importMailContactsAction, updateMailContactStatus, deleteMailContact } from '../../actions'
import { Search, Upload, Check, AlertTriangle, Mail, Send, Trash2, Home } from 'lucide-react'

type MailContact = {
  id: string
  contactId: string | null
  firstName: string | null
  lastName: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  status: string
}

type CRMContact = {
  id: string
  firstName: string
  lastName: string
  mobilePhone: string | null
  phone: string | null
  email: string | null
  streetNumber: string | null
  streetName: string | null
  apartment: string | null
  building: string | null
  addressComplement: string | null
  postalCode: string | null
  city: string | null
  address: string | null
  isNpai: boolean
}

type CourrierClientProps = {
  permanenceId: string
  mailContacts: MailContact[]
  crmContacts: CRMContact[]
  isReadOnly: boolean
}

export default function CourrierClient({
  permanenceId,
  mailContacts,
  crmContacts,
  isReadOnly
}: CourrierClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'list' | 'add_crm' | 'import_csv'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [onlyNoEmail, setOnlyNoEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csvStatus, setCsvStatus] = useState<string | null>(null)

  // Filtering CRM contacts in search tab
  const filteredCRM = crmContacts.filter(c => {
    // If onlyNoEmail is checked, only show contacts without email
    if (onlyNoEmail && c.email) return false

    const full = `${c.firstName} ${c.lastName}`.toLowerCase()
    return (
      full.includes(searchTerm.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }).slice(0, 15) // limit to 15 display

  const handleAddCRM = async (contactId: string) => {
    if (isReadOnly) return
    setLoading(true)
    setError(null)
    const res = await addContactToMailList(permanenceId, contactId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'ajout.')
    } else {
      router.refresh()
      setActiveTab('list')
    }
    setLoading(false)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setCsvStatus('Analyse du fichier...')
    setError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed = results.data as any[]
        if (parsed.length === 0) {
          setError('Le fichier CSV est vide.')
          setLoading(false)
          setCsvStatus(null)
          return
        }

        // Map fields
        const mapped = parsed.map(row => {
          const prenom = row.prenom || row.firstName || row['Prénom'] || row['firstName'] || ''
          const nom = row.nom || row.lastName || row['Nom'] || row['lastName'] || ''
          const adresse = row.adresse || row.address || row['Adresse'] || row['address'] || ''
          const cp = row.code_postal || row.postalCode || row['Code Postal'] || row['postalCode'] || row['cp'] || ''
          const ville = row.ville || row.city || row['Ville'] || row['city'] || ''
          return {
            firstName: prenom,
            lastName: nom,
            address: adresse,
            postalCode: cp,
            city: ville
          }
        })

        // Call Server Action to import and detect duplicates
        const res = await importMailContactsAction(permanenceId, mapped)
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'importation.')
        } else {
          setCsvStatus(
            `Importation réussie : ${res.data?.imported} contacts ajoutés. ${res.data?.updated} contacts mis à jour.`
          );
          router.refresh()
        }
        setLoading(false)
      },
      error: (err) => {
        setError(`Erreur de parsing : ${err.message}`)
        setLoading(false)
        setCsvStatus(null)
      }
    })
  }

  const handleUpdateStatus = async (mcId: string, status: string) => {
    if (isReadOnly) return
    setError(null)
    const res = await updateMailContactStatus(permanenceId, mcId, status)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la mise à jour.')
    } else {
      router.refresh()
    }
  }

  const handleDelete = async (mcId: string) => {
    if (isReadOnly) return
    if (!confirm('Supprimer ce contact de la liste de courrier ?')) return
    setError(null)
    const res = await deleteMailContact(permanenceId, mcId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la suppression.')
    } else {
      router.refresh()
    }
  }

  // Stats
  const total = mailContacts.length
  const preparer = mailContacts.filter(c => c.status === 'A_PREPARER').length
  const envoye = mailContacts.filter(c => c.status === 'ENVOYE').length
  const npai = mailContacts.filter(c => c.status === 'NPAI').length

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* COMPTEURS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cibles courrier</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', borderColor: 'var(--warning)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{preparer}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>À préparer</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', borderColor: 'var(--success)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{envoye}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Envoyés</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{npai}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NPAI (Adresses invalides)</div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <button
          onClick={() => { setActiveTab('list'); setError(null); setCsvStatus(null); }}
          style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'list' ? 'bold' : 'normal', color: activeTab === 'list' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Liste Courrier ({total})
        </button>
        {!isReadOnly && (
          <>
            <button
              onClick={() => { setActiveTab('add_crm'); setError(null); setCsvStatus(null); }}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'add_crm' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'add_crm' ? 'bold' : 'normal', color: activeTab === 'add_crm' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              Ajouter via CRM
            </button>
            <button
              onClick={() => { setActiveTab('import_csv'); setError(null); setCsvStatus(null); }}
              style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'import_csv' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'import_csv' ? 'bold' : 'normal', color: activeTab === 'import_csv' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              Importer un fichier (CSV)
            </button>
          </>
        )}
      </div>

      {/* TAB CONTENT: LIST */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nom Complet</th>
                <th>Adresse de Livraison</th>
                <th style={{ width: '180px' }}>Statut du Pli</th>
                {!isReadOnly && <th style={{ width: '50px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {mailContacts.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 3 : 4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    La liste de courrier est vide pour le moment.
                  </td>
                </tr>
              ) : (
                mailContacts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {c.firstName} {c.lastName}
                        {c.contactId && (
                          <span style={{ fontSize: '0.6rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.05rem 0.3rem', borderRadius: '3px', fontWeight: 'bold' }}>
                            CRM
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {c.address ? (
                        <div>
                          <div>{c.address}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{c.postalCode} {c.city}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pas d\'adresse renseignée</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={c.status}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                        className="form-control"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8125rem',
                          backgroundColor: c.status === 'NPAI' ? '#fef2f2' : c.status === 'ENVOYE' ? '#f0fdf4' : 'inherit',
                          color: c.status === 'NPAI' ? '#dc2626' : c.status === 'ENVOYE' ? '#15803d' : 'inherit',
                          borderColor: c.status === 'NPAI' ? '#fca5a5' : c.status === 'ENVOYE' ? '#bbf7d0' : 'var(--border)'
                        }}
                      >
                        <option value="A_PREPARER">À préparer</option>
                        <option value="ENVOYE">Envoyé</option>
                        <option value="NPAI">NPAI (Non Habite...)</option>
                      </select>
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="text-red-500 hover:text-red-700"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: ADD CRM */}
      {activeTab === 'add_crm' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Rechercher un contact dans le CRM</h4>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, prénom ou commune..."
                className="form-control"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={onlyNoEmail}
                onChange={(e) => setOnlyNoEmail(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Uniquement sans email
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCRM.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Aucun contact correspondant.
              </div>
            ) : (
              filteredCRM.map(c => {
                const isAlreadyAdded = mailContacts.some(mc => mc.contactId === c.id)
                const isNpaiInCRM = c.isNpai
                
                const street = [c.streetNumber, c.streetName].filter(Boolean).join(' ')
                const details = [c.apartment, c.building, c.addressComplement].filter(Boolean).join(', ')
                const fullAddr = [street, details].filter(Boolean).join(', ') || c.address || ''

                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: isNpaiInCRM ? '1px solid #fca5a5' : '1px solid var(--border)', backgroundColor: isNpaiInCRM ? '#fef2f2' : 'inherit', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.firstName} {c.lastName}
                        {isNpaiInCRM && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.05rem 0.3rem', borderRadius: '3px', fontWeight: 'bold' }}>
                            NPAI
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {fullAddr ? `🏠 ${fullAddr}, ${c.postalCode || ''} ${c.city || ''}` : '❌ Pas d\'adresse postale'}
                        {c.email && ` | ✉️ ${c.email}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAlreadyAdded || loading || isNpaiInCRM}
                      onClick={() => handleAddCRM(c.id)}
                      className={isAlreadyAdded ? "button outline" : "button"}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      {isAlreadyAdded ? 'Déjà ajouté' : isNpaiInCRM ? 'Adresse Invalide' : 'Ajouter'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: IMPORT CSV */}
      {activeTab === 'import_csv' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <Upload size={48} className="text-gray-400" style={{ margin: '0 auto 1rem auto' }} />
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Importer des destinataires via CSV</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Sélectionnez un fichier CSV contenant des colonnes telles que : prenom, nom, adresse, code_postal (ou cp), ville. Les doublons potentiels avec le CRM seront automatiquement liés.
          </p>

          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <label className="button" style={{ cursor: loading ? 'default' : 'pointer' }}>
              <input
                type="file"
                accept=".csv"
                disabled={loading}
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
              Choisir un fichier CSV
            </label>
            
            {csvStatus && (
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', padding: '0.5rem', backgroundColor: '#e0e7ff', borderRadius: '4px' }}>
                {csvStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
