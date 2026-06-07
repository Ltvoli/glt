'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { addContactToPhoning, importPhoningContactsAction, updateCallStatusAction, deletePhoningContact } from '../../actions'
import { Search, Upload, Check, AlertTriangle, Phone, PhoneCall, PhoneForwarded, Trash2, HelpCircle } from 'lucide-react'

type PCContact = {
  id: string
  contactId: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  city: string | null
  role: string
  callStatus: string
  requestSummary: string | null
  requiresDeputyAttention: boolean
}

type CRMContact = {
  id: string
  firstName: string
  lastName: string
  mobilePhone: string | null
  phone: string | null
  email: string | null
  city: string | null
}

type PhoningClientProps = {
  permanenceId: string
  phoningContacts: PCContact[]
  crmContacts: CRMContact[]
  isReadOnly: boolean
}

export default function PhoningClient({
  permanenceId,
  phoningContacts,
  crmContacts,
  isReadOnly
}: PhoningClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'list' | 'add_crm' | 'import_csv'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [csvStatus, setCsvStatus] = useState<string | null>(null)

  // Filtering CRM contacts in search tab
  const filteredCRM = crmContacts.filter(c => {
    const full = `${c.firstName} ${c.lastName}`.toLowerCase()
    return full.includes(searchTerm.toLowerCase()) || (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  }).slice(0, 15) // limit to 15 display

  const handleAddCRM = async (contactId: string) => {
    if (isReadOnly) return
    setLoading(true)
    setError(null)
    const res = await addContactToPhoning(permanenceId, contactId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'ajout.')
    } else {
      router.refresh()
      // Switch back to list tab
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
          const tel = row.telephone || row.phone || row.portable || row['Téléphone'] || row['Portable'] || row['phone'] || ''
          const email = row.email || row.courriel || row['Email'] || row['email'] || ''
          const ville = row.ville || row.city || row['Ville'] || row['city'] || ''
          return {
            firstName: prenom,
            lastName: nom,
            phone: tel,
            email: email,
            city: ville
          }
        })

        // Call Server Action to import and detect duplicates
        const res = await importPhoningContactsAction(permanenceId, mapped)
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'importation.')
        } else {
          setCsvStatus(`Importation réussie : ${res.data?.count} contacts ajoutés. Doublons potentiels détectés : ${res.data?.duplicates}.`)
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

  const handleUpdateCall = async (pcId: string, status: string, summary: string, requiresAttention: boolean) => {
    if (isReadOnly) return
    const res = await updateCallStatusAction(permanenceId, pcId, {
      callStatus: status as any,
      requestSummary: summary,
      requiresDeputyAttention: requiresAttention
    })
    if (!res.success) {
      setError(res.error || 'Erreur lors de la mise à jour.')
    }
  }

  const handleDelete = async (pcId: string) => {
    if (isReadOnly) return
    if (!confirm('Supprimer ce contact de la liste ?')) return
    const res = await deletePhoningContact(permanenceId, pcId)
    if (!res.success) {
      setError(res.error || 'Erreur.')
    } else {
      router.refresh()
    }
  }

  // Stats
  const total = phoningContacts.length
  const joint = phoningContacts.filter(c => c.callStatus === 'REACHED' || c.callStatus === 'APPOINTMENT_CONFIRMED').length
  const message = phoningContacts.filter(c => c.callStatus === 'VOICEMAIL').length
  const callback = phoningContacts.filter(c => c.callStatus === 'CALLBACK_REQUESTED').length
  const requiresAttention = phoningContacts.filter(c => c.requiresDeputyAttention).length

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* COMPTEURS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cibles phoning</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', borderColor: 'var(--success)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{joint}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joints (RDV/OK)</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{message}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Répondeurs</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{callback}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rappels demandés</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{requiresAttention}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signalements député</div>
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
          Liste Phoning ({total})
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
                <th>Coordonnées</th>
                <th style={{ width: '180px' }}>Statut d'Appel</th>
                <th>Note / Demande Électeur</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Signalement</th>
                {!isReadOnly && <th style={{ width: '50px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {phoningContacts.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 5 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    La liste phoning est vide pour le moment.
                  </td>
                </tr>
              ) : (
                phoningContacts.map(c => (
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
                      {c.city && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.city}</div>}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {c.phone && <div>📞 {c.phone}</div>}
                      {c.email && <div style={{ color: 'var(--text-muted)' }}>✉️ {c.email}</div>}
                    </td>
                    <td>
                      <select
                        value={c.callStatus}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateCall(c.id, e.target.value, c.requestSummary || '', c.requiresDeputyAttention)}
                        className="form-control"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                      >
                        <option value="NOT_CALLED">Non appelé</option>
                        <option value="REACHED">Joint</option>
                        <option value="ABSENT">Absent</option>
                        <option value="VOICEMAIL">Répondeur</option>
                        <option value="APPOINTMENT_CONFIRMED">RDV Confirmé</option>
                        <option value="CALLBACK_REQUESTED">Rappel demandé</option>
                        <option value="REFUSED">Refus / Ne pas appeler</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={c.requestSummary || ''}
                        disabled={isReadOnly}
                        placeholder="Résumé de la demande..."
                        onBlur={(e) => handleUpdateCall(c.id, c.callStatus, e.target.value, c.requiresDeputyAttention)}
                        className="form-control"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        defaultChecked={c.requiresDeputyAttention}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateCall(c.id, c.callStatus, c.requestSummary || '', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: isReadOnly ? 'default' : 'pointer' }}
                      />
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
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCRM.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Aucun contact correspondant.
              </div>
            ) : (
              filteredCRM.map(c => {
                const isAlreadyAdded = phoningContacts.some(pc => pc.contactId === c.id)
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.city || 'Ville inconnue'} {c.mobilePhone || c.phone ? ` - ${c.mobilePhone || c.phone}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAlreadyAdded || loading}
                      onClick={() => handleAddCRM(c.id)}
                      className={isAlreadyAdded ? "button outline" : "button"}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      {isAlreadyAdded ? 'Déjà ajouté' : 'Ajouter'}
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
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Importer des contacts phoning via CSV</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Sélectionnez un fichier CSV contenant des colonnes telles que : prénom, nom, téléphone/portable, email, ville. Les doublons potentiels avec le CRM seront automatiquement signalés.
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
