'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addOrganizationToMerchant, createQuickOrganization, updateMerchantAttitudeAction, deleteMerchantOrganization } from '../../actions'
import { Search, Plus, Trash2, Heart, ShieldAlert, Check } from 'lucide-react'

type MerchantOrg = {
  id: string
  organizationId: string | null
  orgName: string | null
  type: string
  sector: string | null
  attitude: string | null
  concern: string | null
  visitRecommended: boolean
  visited: boolean
}

type OrgCRM = {
  id: string
  name: string
  sector: string | null
  notes: string | null
}

type CommercantsClientProps = {
  permanenceId: string
  merchantOrgs: MerchantOrg[]
  crmOrgs: OrgCRM[]
  isReadOnly: boolean
}

export default function CommercantsClient({
  permanenceId,
  merchantOrgs,
  crmOrgs,
  isReadOnly
}: CommercantsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'list' | 'add_crm' | 'quick_new'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFavorable, setFilterFavorable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states for quick new org
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSector, setNewOrgSector] = useState('')
  const [newOrgNotes, setNewOrgNotes] = useState('')

  const handleAddCRM = async (orgId: string) => {
    if (isReadOnly) return
    setLoading(true)
    setError(null)
    const res = await addOrganizationToMerchant(permanenceId, orgId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'ajout.')
    } else {
      router.refresh()
      setActiveTab('list')
    }
    setLoading(false)
  }

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!newOrgName.trim()) return

    setLoading(true)
    setError(null)
    const res = await createQuickOrganization(permanenceId, newOrgName, newOrgSector, newOrgNotes)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la création.')
    } else {
      setNewOrgName('')
      setNewOrgSector('')
      setNewOrgNotes('')
      router.refresh()
      setActiveTab('list')
    }
    setLoading(false)
  }

  const handleUpdateMerchant = async (poId: string, field: 'attitude' | 'concern' | 'visitRecommended' | 'visited', value: any) => {
    if (isReadOnly) return
    const res = await updateMerchantAttitudeAction(permanenceId, poId, { [field]: value })
    if (!res.success) {
      setError(res.error || 'Erreur de mise à jour.')
    } else {
      router.refresh()
    }
  }

  const handleDelete = async (poId: string) => {
    if (isReadOnly) return
    if (!confirm('Retirer ce commerce de la liste ?')) return
    const res = await deleteMerchantOrganization(permanenceId, poId)
    if (!res.success) {
      setError(res.error || 'Erreur.')
    } else {
      router.refresh()
    }
  }

  const filteredCRM = crmOrgs.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.sector && o.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 10)

  const displayedMerchants = filterFavorable 
    ? merchantOrgs.filter(m => m.attitude === 'favorable')
    : merchantOrgs

  return (
    <div style={{ marginTop: '2rem' }}>
      {error && (
        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* FILTER AND TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button
            onClick={() => { setActiveTab('list'); setError(null); }}
            style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'list' ? 'bold' : 'normal', color: activeTab === 'list' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Commerces à visiter ({displayedMerchants.length})
          </button>
          {!isReadOnly && (
            <>
              <button
                onClick={() => { setActiveTab('add_crm'); setError(null); }}
                style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'add_crm' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'add_crm' ? 'bold' : 'normal', color: activeTab === 'add_crm' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
              >
                Associer commerce CRM
              </button>
              <button
                onClick={() => { setActiveTab('quick_new'); setError(null); }}
                style={{ padding: '0.75rem 0.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'quick_new' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'quick_new' ? 'bold' : 'normal', color: activeTab === 'quick_new' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
              >
                Création rapide
              </button>
            </>
          )}
        </div>

        {activeTab === 'list' && (
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
            <input
              type="checkbox"
              checked={filterFavorable}
              onChange={(e) => setFilterFavorable(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Favorables uniquement</span>
          </label>
        )}
      </div>

      {/* TAB CONTENT: LIST */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nom du commerce</th>
                <th>Secteur d'activité</th>
                <th style={{ width: '150px' }}>Attitude</th>
                <th>Préoccupation principale</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Recommandé</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Visité</th>
                {!isReadOnly && <th style={{ width: '50px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {displayedMerchants.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 6 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Aucun commerce enregistré dans la liste.
                  </td>
                </tr>
              ) : (
                displayedMerchants.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.orgName}</td>
                    <td>{m.sector || 'Général'}</td>
                    <td>
                      <select
                        value={m.attitude || ''}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateMerchant(m.id, 'attitude', e.target.value)}
                        className="form-control"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="favorable">Favorable</option>
                        <option value="neutre">Neutre</option>
                        <option value="defavorable">Défavorable</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={m.concern || ''}
                        disabled={isReadOnly}
                        placeholder="Ex: Factures élec, insécurité..."
                        onBlur={(e) => handleUpdateMerchant(m.id, 'concern', e.target.value)}
                        className="form-control"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        defaultChecked={m.visitRecommended}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateMerchant(m.id, 'visitRecommended', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: isReadOnly ? 'default' : 'pointer' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        defaultChecked={m.visited}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateMerchant(m.id, 'visited', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: isReadOnly ? 'default' : 'pointer' }}
                      />
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
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
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Associer un commerce existant du CRM</h4>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom d'organisation ou secteur..."
              className="form-control"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCRM.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Aucune organisation de type COMMERCE correspondante.
              </div>
            ) : (
              filteredCRM.map(o => {
                const isAlreadyAdded = merchantOrgs.some(m => m.organizationId === o.id)
                return (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{o.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Secteur : {o.sector || 'Général'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAlreadyAdded || loading}
                      onClick={() => handleAddCRM(o.id)}
                      className={isAlreadyAdded ? "button outline" : "button"}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      {isAlreadyAdded ? 'Déjà associé' : 'Associer'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: QUICK NEW */}
      {activeTab === 'quick_new' && (
        <form onSubmit={handleQuickCreate} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontWeight: 600 }}>Créer rapidement un commerce et l'associer</h4>
          
          <div className="form-group">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Nom du commerce</label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
              placeholder="Ex: Boulangerie de la Poste"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Secteur d'activité</label>
            <input
              type="text"
              value={newOrgSector}
              onChange={(e) => setNewOrgSector(e.target.value)}
              placeholder="Ex: Alimentation, Habillement, Café..."
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Notes initiales</label>
            <textarea
              value={newOrgNotes}
              onChange={(e) => setNewOrgNotes(e.target.value)}
              rows={2}
              placeholder="Notes d'intérêt général..."
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button"
            style={{ alignSelf: 'flex-end', minWidth: '150px' }}
          >
            {loading ? 'Création...' : 'Créer et associer'}
          </button>
        </form>
      )}
    </div>
  )
}
