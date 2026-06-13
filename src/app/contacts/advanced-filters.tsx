'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, MapPin, Phone, User, Map, Filter, SlidersHorizontal } from 'lucide-react'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type ChipType = 'city' | 'phone' | 'name' | 'street'

type Chip = {
  id: string
  type: ChipType
  value: string
}

const CHIP_META: Record<ChipType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  city:   { label: 'Ville',     icon: <MapPin  size={11} />, color: '#1d4ed8', bg: '#dbeafe' },
  phone:  { label: 'Tél.',      icon: <Phone   size={11} />, color: '#166534', bg: '#dcfce7' },
  name:   { label: 'Nom',       icon: <User    size={11} />, color: '#7c3aed', bg: '#ede9fe' },
  street: { label: 'Rue',       icon: <Map     size={11} />, color: '#b45309', bg: '#fef3c7' },
}

// ──────────────────────────────────────────────
// Detection heuristics
// ──────────────────────────────────────────────
function detectType(value: string, uniqueCities: string[]): ChipType {
  const v = value.trim()
  // Phone: 8+ chars, mostly digits, can start with + or 0
  if (/^[\+0][\d\s\.\-]{6,}$/.test(v) || /^\d{7,}$/.test(v)) return 'phone'
  // Street: starts with a street keyword
  if (/^(rue|avenue|av\.?|allée|chemin|route|impasse|bd\.?|boulevard|passage|place|square|résidence|hameau|lieu-dit)\s/i.test(v)) return 'street'
  // City: exact match (case-insensitive) against known cities
  if (uniqueCities.some(c => c.toLowerCase() === v.toLowerCase())) return 'city'
  // Default: name
  return 'name'
}

// ──────────────────────────────────────────────
// Chip display
// ──────────────────────────────────────────────
function ChipBadge({ chip, onRemove }: { chip: Chip; onRemove: () => void }) {
  const meta = CHIP_META[chip.type]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.45rem 0.2rem 0.5rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: 600,
      color: meta.color,
      backgroundColor: meta.bg,
      border: `1px solid ${meta.color}33`,
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      {meta.icon}
      <span style={{ opacity: 0.7, marginRight: '1px' }}>{meta.label}:</span>
      {chip.value}
      <button
        onClick={onRemove}
        title="Supprimer ce filtre"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', padding: '0 0 0 2px',
          color: meta.color, opacity: 0.7,
        }}
      >
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  )
}

// ──────────────────────────────────────────────
// Autocomplete suggestions
// ──────────────────────────────────────────────
function Suggestions({
  query,
  uniqueCities,
  onSelect,
}: {
  query: string
  uniqueCities: string[]
  onSelect: (value: string, type: ChipType) => void
}) {
  if (query.length < 2) return null

  const q = query.toLowerCase()
  const citySuggestions = uniqueCities
    .filter(c => c.toLowerCase().includes(q))
    .slice(0, 5)

  const detectedType = detectType(query, uniqueCities)

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      backgroundColor: 'var(--background)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      zIndex: 200,
      overflow: 'hidden',
    }}>
      {/* Immediate action: add current input as chip */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onSelect(query, detectedType) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          textAlign: 'left',
          borderBottom: citySuggestions.length > 0 ? '1px solid var(--border)' : 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <span style={{ ...CHIP_META[detectedType] as any, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
          {CHIP_META[detectedType].icon} {CHIP_META[detectedType].label}
        </span>
        <span style={{ fontWeight: 600 }}>{query}</span>
      </button>

      {/* City suggestions */}
      {citySuggestions.map(city => (
        <button
          key={city}
          onMouseDown={(e) => { e.preventDefault(); onSelect(city, 'city') }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <MapPin size={13} style={{ color: CHIP_META.city.color, flexShrink: 0 }} />
          <span>Ville : <strong>{city}</strong></span>
        </button>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function AdvancedFilters({
  allTags,
  uniqueSectors,
  uniqueCities = [],
}: {
  allTags: any[]
  uniqueSectors: string[]
  uniqueCities?: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Rebuild chips from URL params on mount
  const buildChipsFromParams = (): Chip[] => {
    const chips: Chip[] = []
    const p = searchParams

    const cities   = p.get('city')?.split(',').filter(Boolean) || []
    const phones   = p.get('phone')?.split(',').filter(Boolean) || []
    const names    = p.get('nameQ')?.split(',').filter(Boolean) || []
    const streets  = p.get('streetQ')?.split(',').filter(Boolean) || []

    cities.forEach(v  => chips.push({ id: crypto.randomUUID(), type: 'city',   value: v }))
    phones.forEach(v  => chips.push({ id: crypto.randomUUID(), type: 'phone',  value: v }))
    names.forEach(v   => chips.push({ id: crypto.randomUUID(), type: 'name',   value: v }))
    streets.forEach(v => chips.push({ id: crypto.randomUUID(), type: 'street', value: v }))

    return chips
  }

  const [chips, setChips] = useState<Chip[]>(buildChipsFromParams)
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Advanced filters state
  const [lastInteraction, setLastInteraction] = useState(searchParams.get('lastInteraction') || '')
  const [supportLevel, setSupportLevel]       = useState(searchParams.get('supportLevel') || '')
  const [meetingStep, setMeetingStep]         = useState(searchParams.get('meetingStep') || '')
  const [territorySector, setTerritorySector] = useState(searchParams.get('sector') || '')
  const [emailStatus, setEmailStatus]         = useState(searchParams.get('emailStatus') || 'all')
  const [phoneStatus, setPhoneStatus]         = useState(searchParams.get('phoneStatus') || 'all')
  const [gender, setGender]                   = useState(searchParams.get('gender') || 'all')
  const [addressStatus, setAddressStatus]     = useState(searchParams.get('addressStatus') || 'all')
  const [tag, setTag]                         = useState(searchParams.get('tag') || '')

  const inputRef = useRef<HTMLInputElement>(null)

  const hasAdvancedFilters = lastInteraction || supportLevel || meetingStep || territorySector ||
    (emailStatus !== 'all') || (phoneStatus !== 'all') || (gender !== 'all') || (addressStatus !== 'all') || tag

  // Build URL and navigate
  const buildAndNavigate = (newChips: Chip[], extraParams?: Record<string, string>) => {
    const params = new URLSearchParams()

    const byType = (type: ChipType) => newChips.filter(c => c.type === type).map(c => c.value).join(',')
    if (byType('city'))   params.set('city',    byType('city'))
    if (byType('phone'))  params.set('phone',   byType('phone'))
    if (byType('name'))   params.set('nameQ',   byType('name'))
    if (byType('street')) params.set('streetQ', byType('street'))

    if (lastInteraction)              params.set('lastInteraction', lastInteraction)
    if (supportLevel)                 params.set('supportLevel', supportLevel)
    if (meetingStep && meetingStep !== 'all') params.set('meetingStep', meetingStep)
    if (territorySector)              params.set('sector', territorySector)
    if (emailStatus && emailStatus !== 'all')   params.set('emailStatus', emailStatus)
    if (phoneStatus && phoneStatus !== 'all')   params.set('phoneStatus', phoneStatus)
    if (gender && gender !== 'all')             params.set('gender', gender)
    if (addressStatus && addressStatus !== 'all') params.set('addressStatus', addressStatus)
    if (tag)                          params.set('tag', tag)

    if (extraParams) Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))

    router.push(`/contacts?${params.toString()}`)
  }

  // Add a chip
  const addChip = (value: string, type: ChipType) => {
    if (!value.trim()) return
    const newChip: Chip = { id: crypto.randomUUID(), type, value: value.trim() }
    const newChips = [...chips, newChip]
    setChips(newChips)
    setInputValue('')
    setShowSuggestions(false)
    buildAndNavigate(newChips)
  }

  // Remove a chip
  const removeChip = (id: string) => {
    const newChips = chips.filter(c => c.id !== id)
    setChips(newChips)
    buildAndNavigate(newChips)
  }

  // Reset all
  const resetAll = () => {
    setChips([])
    setInputValue('')
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
    setShowAdvanced(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      addChip(inputValue, detectType(inputValue, uniqueCities))
    }
    if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      removeChip(chips[chips.length - 1].id)
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setInputValue('')
    }
  }

  const totalActiveFilters = chips.length + (hasAdvancedFilters ? 1 : 0)

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ─── Main Search Bar ─── */}
      <div className="card" style={{ padding: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

        {/* Search icon */}
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.25rem' }} />

        {/* Chips + Input wrapper */}
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', flex: 1, alignItems: 'center', position: 'relative', cursor: 'text' }}
          onClick={() => inputRef.current?.focus()}
        >
          {chips.map(chip => (
            <ChipBadge key={chip.id} chip={chip} onRemove={() => removeChip(chip.id)} />
          ))}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={chips.length === 0 ? 'Ville, nom, rue, téléphone... (Entrée pour valider)' : 'Affiner...'}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              flex: 1,
              minWidth: '200px',
              color: 'var(--foreground)',
            }}
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && inputValue.length >= 1 && (
            <Suggestions
              query={inputValue}
              uniqueCities={uniqueCities}
              onSelect={(v, t) => { addChip(v, t); inputRef.current?.focus() }}
            />
          )}
        </div>

        {/* Clear chips */}
        {chips.length > 0 && (
          <button
            onClick={resetAll}
            title="Effacer la recherche"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

        {/* Advanced filters toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            backgroundColor: hasAdvancedFilters ? '#e0f2fe' : 'transparent',
            color: hasAdvancedFilters ? '#0369a1' : 'var(--text-muted)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={14} />
          {hasAdvancedFilters ? `Filtres (${totalActiveFilters})` : 'Filtres'}
        </button>
      </div>

      {/* ─── Hint row ─── */}
      {chips.length === 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: '📍 Ville', hint: 'ex: Grasse', type: 'city' as ChipType },
            { label: '📞 Téléphone', hint: 'ex: 0612345678', type: 'phone' as ChipType },
            { label: '👤 Nom', hint: 'ex: Dupont', type: 'name' as ChipType },
            { label: '🏘 Rue', hint: 'ex: Rue Victor Hugo', type: 'street' as ChipType },
          ].map(({ label, hint, type }) => (
            <button
              key={type}
              onClick={() => { setInputValue(''); inputRef.current?.focus() }}
              title={hint}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                border: '1px dashed var(--border)',
                background: 'transparent',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                cursor: 'text',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Advanced Filters Panel ─── */}
      {showAdvanced && (
        <div className="card" style={{ marginTop: '0.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} /> Filtres avancés
            </h3>
            <button onClick={() => setShowAdvanced(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>

            {/* Col 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dernier contact
                </label>
                <input type="date" value={lastInteraction} onChange={e => setLastInteraction(e.target.value)} className="form-control" style={{ fontSize: '0.875rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Niveau de soutien
                </label>
                <select value={supportLevel} onChange={e => setSupportLevel(e.target.value)} className="form-control" style={{ fontSize: '0.875rem' }}>
                  <option value="">Tous</option>
                  <option value="1">1 — Très défavorable</option>
                  <option value="2">2 — Défavorable</option>
                  <option value="3">3 — Neutre</option>
                  <option value="4">4 — Favorable</option>
                  <option value="5">5 — Très favorable</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Étape de rencontre
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {['all', 'Absent', 'Accepté', 'Refusé', 'Repassés', 'Pas encore contactés'].map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="radio" name="meetingStep" value={opt} checked={meetingStep === opt || (opt === 'all' && !meetingStep)} onChange={() => setMeetingStep(opt === 'all' ? '' : opt)} />
                      {opt === 'all' ? <strong>Tous</strong> : opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secteur
                </label>
                <select value={territorySector} onChange={e => setTerritorySector(e.target.value)} className="form-control" style={{ fontSize: '0.875rem' }}>
                  <option value="">Tous les secteurs</option>
                  {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tags
                </label>
                <select value={tag} onChange={e => setTag(e.target.value)} className="form-control" style={{ fontSize: '0.875rem' }}>
                  <option value="">Tous les tags</option>
                  {allTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Genre
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[['all', 'Tous'], ['H', 'Homme'], ['F', 'Femme'], ['Autre', 'Autre']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} />
                      {v === 'all' ? <strong>{l}</strong> : l}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[['all', 'Tous'], ['has_email', 'Renseigné'], ['no_email', 'Non renseigné']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="radio" name="email" value={v} checked={emailStatus === v} onChange={() => setEmailStatus(v)} />
                      {v === 'all' ? <strong>{l}</strong> : l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Téléphone
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[['all', 'Tous'], ['mobile', 'Mobile renseigné'], ['any', 'Fixe ou mobile'], ['none', 'Non renseigné']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="radio" name="phone" value={v} checked={phoneStatus === v} onChange={() => setPhoneStatus(v)} />
                      {v === 'all' ? <strong>{l}</strong> : l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Localisation
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[['all', 'Tous'], ['unknown', 'Adresse inconnue']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="radio" name="localisation" value={v} checked={addressStatus === v} onChange={() => setAddressStatus(v)} />
                      {v === 'all' ? <strong>{l}</strong> : l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button onClick={resetAll} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>
              Réinitialiser tout
            </button>
            <button
              onClick={() => { buildAndNavigate(chips); setShowAdvanced(false) }}
              className="button"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
