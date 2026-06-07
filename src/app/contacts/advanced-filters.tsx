'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import TagSelector from '@/components/ui/tag-selector'

export default function AdvancedFilters({
  allTags,
  uniqueSectors
}: {
  allTags: any[]
  uniqueSectors: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isOpen, setIsOpen] = useState(false)

  // Basic filters
  const [q, setQ] = useState(searchParams.get('q') || '')
  
  // Advanced filters
  const [lastInteraction, setLastInteraction] = useState(searchParams.get('lastInteraction') || '')
  const [supportLevel, setSupportLevel] = useState(searchParams.get('supportLevel') || '')
  const [meetingStep, setMeetingStep] = useState(searchParams.get('meetingStep') || '')
  const [territorySector, setTerritorySector] = useState(searchParams.get('sector') || '')
  const [emailStatus, setEmailStatus] = useState(searchParams.get('emailStatus') || 'all')
  const [phoneStatus, setPhoneStatus] = useState(searchParams.get('phoneStatus') || 'all')
  const [gender, setGender] = useState(searchParams.get('gender') || 'all')
  const [addressStatus, setAddressStatus] = useState(searchParams.get('addressStatus') || 'all')
  
  // Tags (we can only support one tag in the current schema without breaking things, but we'll use a local string for now)
  const [tag, setTag] = useState(searchParams.get('tag') || '')

  const hasActiveFilters = q || lastInteraction || supportLevel || meetingStep || territorySector || 
                           (emailStatus !== 'all') || (phoneStatus !== 'all') || (gender !== 'all') || 
                           (addressStatus !== 'all') || tag

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (q) params.set('q', q)
    if (lastInteraction) params.set('lastInteraction', lastInteraction)
    if (supportLevel) params.set('supportLevel', supportLevel)
    if (meetingStep && meetingStep !== 'all') params.set('meetingStep', meetingStep)
    if (territorySector) params.set('sector', territorySector)
    if (emailStatus && emailStatus !== 'all') params.set('emailStatus', emailStatus)
    if (phoneStatus && phoneStatus !== 'all') params.set('phoneStatus', phoneStatus)
    if (gender && gender !== 'all') params.set('gender', gender)
    if (addressStatus && addressStatus !== 'all') params.set('addressStatus', addressStatus)
    if (tag) params.set('tag', tag)
    
    router.push(`/contacts?${params.toString()}`)
    setIsOpen(false)
  }

  const resetFilters = () => {
    setQ('')
    setLastInteraction('')
    setSupportLevel('')
    setMeetingStep('')
    setTerritorySector('')
    setEmailStatus('all')
    setPhoneStatus('all')
    setGender('all')
    setAddressStatus('all')
    setTag('')
    router.push('/contacts')
    setIsOpen(false)
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Search Bar - Always visible */}
      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Rechercher (Nom, Ville, Type...)" 
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <button onClick={applyFilters} className="button">Rechercher</button>
        <button 
          onClick={() => setIsOpen(true)} 
          className={`button ${hasActiveFilters ? 'primary' : 'outline'}`}
        >
          {hasActiveFilters ? 'Filtres actifs' : 'Filtres'}
        </button>
      </div>

      {/* Expandable Panel / Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              Filtres
            </h2>

            {/* Content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                
                {/* Column 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Dernier contact via mobile</label>
                    <input type="date" value={lastInteraction} onChange={e => setLastInteraction(e.target.value)} className="form-control" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Niveau de soutien</label>
                    <select value={supportLevel} onChange={e => setSupportLevel(e.target.value)} className="form-control">
                      <option value="">Choisir</option>
                      <option value="1">1 - Très défavorable</option>
                      <option value="2">2 - Défavorable</option>
                      <option value="3">3 - Neutre</option>
                      <option value="4">4 - Favorable</option>
                      <option value="5">5 - Très favorable</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Étape de la rencontre</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      {['Absent', 'Accepté', 'Refusé', 'Repassés', 'Pas encore contactés', 'all'].map((opt) => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="radio" name="meetingStep" value={opt} checked={meetingStep === opt || (opt === 'all' && !meetingStep)} onChange={() => setMeetingStep(opt)} />
                          {opt === 'all' ? <b>Tous les citoyens</b> : opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Territoire</label>
                    <select value={territorySector} onChange={e => setTerritorySector(e.target.value)} className="form-control">
                      <option value="">Choisir</option>
                      {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Email</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="email" value="has_email" checked={emailStatus === 'has_email'} onChange={() => setEmailStatus('has_email')} /> Renseigné
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="email" value="no_email" checked={emailStatus === 'no_email'} onChange={() => setEmailStatus('no_email')} /> Non renseigné
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="email" value="all" checked={emailStatus === 'all'} onChange={() => setEmailStatus('all')} /> <b>Tous les citoyens</b>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Localisation</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="localisation" value="unknown" checked={addressStatus === 'unknown'} onChange={() => setAddressStatus('unknown')} /> Adresse inconnue
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="localisation" value="all" checked={addressStatus === 'all'} onChange={() => setAddressStatus('all')} /> <b>Tous les citoyens</b>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Tags</label>
                    <select value={tag} onChange={e => setTag(e.target.value)} className="form-control">
                      <option value="">Rechercher des tags</option>
                      {allTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Téléphone</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="phone" value="mobile" checked={phoneStatus === 'mobile'} onChange={() => setPhoneStatus('mobile')} /> Champ mobile renseigné
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="phone" value="any" checked={phoneStatus === 'any'} onChange={() => setPhoneStatus('any')} /> Champ fixe ou mobile renseigné
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="phone" value="none" checked={phoneStatus === 'none'} onChange={() => setPhoneStatus('none')} /> Non renseigné
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="phone" value="all" checked={phoneStatus === 'all'} onChange={() => setPhoneStatus('all')} /> <b>Tous les citoyens</b>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e11d48', fontWeight: 500, fontSize: '0.875rem' }}>Genre</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="gender" value="H" checked={gender === 'H'} onChange={() => setGender('H')} /> Homme
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="gender" value="F" checked={gender === 'F'} onChange={() => setGender('F')} /> Femme
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="gender" value="Autre" checked={gender === 'Autre'} onChange={() => setGender('Autre')} /> Autre
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="gender" value="all" checked={gender === 'all'} onChange={() => setGender('all')} /> <b>Tous les citoyens</b>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                Réinitialiser les filtres
              </button>
              <button onClick={applyFilters} className="button" style={{ background: '#1e293b', color: 'white' }}>
                Afficher les résultats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
