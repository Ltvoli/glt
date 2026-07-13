'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, MapPin, Phone, User, Map, Filter, SlidersHorizontal, Plus, Trash2 } from 'lucide-react'
import { getFilteredContactsCount } from './actions'

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
  if (/^[\+0][\d\s\.\-]{6,}$/.test(v) || /^\d{7,}$/.test(v)) return 'phone'
  if (/^(rue|avenue|av\.?|allée|chemin|route|impasse|bd\.?|boulevard|passage|place|square|résidence|hameau|lieu-dit)\s/i.test(v)) return 'street'
  if (uniqueCities.some(c => c.toLowerCase() === v.toLowerCase())) return 'city'
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
  uniqueCities: any[]
  onSelect: (value: string, type: ChipType) => void
}) {
  if (query.length < 2) return null

  const q = query.toLowerCase()
  const citySuggestions = uniqueCities
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 5)

  const cityNames = uniqueCities.map(c => c.name)
  const detectedType = detectType(query, cityNames)

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

      {citySuggestions.map(city => (
        <button
          key={city.name}
          onMouseDown={(e) => { e.preventDefault(); onSelect(city.name, 'city') }}
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
          <span>Ville : <strong>{city.name}</strong> ({city.count})</span>
        </button>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Advanced Rules Helper Configuration
// ──────────────────────────────────────────────
const getPropertyOptions = (dataType: string) => {
  if (dataType === 'contacts') {
    return [
      { value: 'lastName', label: 'Nom' },
      { value: 'firstName', label: 'Prénom' },
      { value: 'usageName', label: "Nom d'usage" },
      { value: 'type', label: 'Type de contact' },
      { value: 'tag', label: 'Tag (Étiquette)' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Téléphone (Fixe)' },
      { value: 'mobilePhone', label: 'Téléphone (Mobile)' },
      { value: 'city', label: 'Ville' },
      { value: 'postalCode', label: 'Code Postal' },
      { value: 'streetName', label: 'Nom de rue' },
      { value: 'building', label: 'Bâtiment' },
      { value: 'buildingType', label: 'Type de bâtiment' },
      { value: 'floor', label: 'Étage' },
      { value: 'supportLevel', label: 'Niveau de soutien' },
      { value: 'gender', label: 'Genre' },
      { value: 'ageRange', label: "Tranche d'âge" },
      { value: 'profession', label: 'Profession' },
      { value: 'nationality', label: 'Nationalité' },
      { value: 'territory', label: 'Territoire' },
      { value: 'department', label: 'Département' },
      { value: 'whatsappStatus', label: 'Statut WhatsApp' },
      { value: 'linkedinUrl', label: 'Lien LinkedIn' },
      { value: 'noContact', label: 'Ne pas contacter (RGPD)' },
      { value: 'isNpai', label: 'Adresse NPAI' },
      { value: 'consentEmail', label: 'Consentement Email' },
      { value: 'consentPhone', label: 'Consentement Téléphone' },
      { value: 'consentSms', label: 'Consentement SMS' },
      { value: 'consentPostal', label: 'Consentement Postal' },
    ]
  } else if (dataType === 'tasks') {
    return [
      { value: 'title', label: 'Titre' },
      { value: 'status', label: 'Statut' },
      { value: 'priority', label: 'Priorité' },
    ]
  } else if (dataType === 'mailcases') {
    return [
      { value: 'subject', label: 'Sujet' },
      { value: 'status', label: 'Statut' },
      { value: 'category', label: 'Catégorie' },
    ]
  } else if (dataType === 'writtenquestions') {
    return [
      { value: 'title', label: 'Titre' },
      { value: 'status', label: 'Statut' },
      { value: 'ministry', label: 'Ministère ciblé' },
    ]
  }
  return []
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function AdvancedFilters({
  allTags = [],
  uniqueCities = [],
  uniqueTerritories = [],
  teamMembers = [],
  totalContactsCount = 0,
  savedFilters = [],
  supportLevels = [],
  contactTypes = [],
  ageRanges = [],
}: {
  allTags?: any[]
  uniqueCities?: any[]
  uniqueTerritories?: any[]
  teamMembers?: any[]
  totalContactsCount?: number
  savedFilters?: any[]
  supportLevels?: any[]
  contactTypes?: any[]
  ageRanges?: any[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const cityNames = uniqueCities.map(c => typeof c === 'string' ? c : c.name)

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'standard' | 'advanced'>('standard')

  // Standard filters state
  const [lastContactMobile, setLastContactMobile]   = useState(searchParams.get('lastContactMobile') || '')
  const [territory, setTerritory]                   = useState(searchParams.get('territory') || '')
  const [tag, setTag]                               = useState(searchParams.get('tag') || '')
  const [tagMode, setTagMode]                       = useState(searchParams.get('tagMode') || 'or')
  const [supportLevel, setSupportLevel]             = useState(searchParams.get('supportLevel') || '')
  const [creatorId, setCreatorId]                   = useState(searchParams.get('creatorId') || '')
  const [emailStatus, setEmailStatus]               = useState(searchParams.get('emailStatus') || 'all')
  const [phoneStatus, setPhoneStatus]               = useState(searchParams.get('phoneStatus') || 'all')
  const [gender, setGender]                         = useState(searchParams.get('gender') || 'all')
  const [permanenceStep, setPermanenceStep]         = useState(searchParams.get('permanenceStep') || 'all')
  const [localisationStatus, setLocalisationStatus] = useState(searchParams.get('localisationStatus') || 'all')
  const [contactType, setContactType]               = useState(searchParams.get('contactType') || 'all')
  const [ageRange, setAgeRange]                     = useState(searchParams.get('ageRange') || '')

  // Advanced filters state
  const [mode, setMode] = useState<'ayant' | 'sans'>('ayant')
  const [rules, setRules] = useState<any[]>([
    { id: crypto.randomUUID(), dataType: 'contacts', property: 'lastName', operator: 'contains', value: '', condition: 'AND' }
  ])

  // Count states
  const [currentCount, setCurrentCount] = useState(totalContactsCount)
  const [isCounting, setIsCounting] = useState(false)

  // Saved filters states
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveShared, setSaveShared] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showSaveSection, setShowSaveSection] = useState(false)

  // Sync count state when prop changes
  useEffect(() => {
    setCurrentCount(totalContactsCount)
  }, [totalContactsCount])

  // Debounced live counting on filter changes
  useEffect(() => {
    if (!showAdvanced) return

    setIsCounting(true)
    const timer = setTimeout(async () => {
      const params: Record<string, string | undefined> = {}

      const byType = (type: ChipType) => chips.filter(c => c.type === type).map(c => c.value).join(',')
      if (byType('city'))   params.city = byType('city')
      if (byType('phone'))  params.phone = byType('phone')
      if (byType('name'))   params.nameQ = byType('name')
      if (byType('street')) params.streetQ = byType('street')

      if (activeTab === 'advanced') {
        const rulesPayload = {
          mode,
          rules: rules.map(r => ({
            dataType: r.dataType,
            property: r.property,
            operator: r.operator,
            value: r.value,
            condition: r.condition,
          }))
        }
        params.advanced_rules = JSON.stringify(rulesPayload)
      } else {
        if (lastContactMobile)   params.lastContactMobile = lastContactMobile
        if (territory)           params.territory = territory
        if (tag) {
          params.tag = tag
          if (tagMode) params.tagMode = tagMode
        }
        if (supportLevel)        params.supportLevel = supportLevel
        if (creatorId)           params.creatorId = creatorId
        if (emailStatus && emailStatus !== 'all')   params.emailStatus = emailStatus
        if (phoneStatus && phoneStatus !== 'all')   params.phoneStatus = phoneStatus
        if (gender && gender !== 'all')             params.gender = gender
        if (permanenceStep && permanenceStep !== 'all') params.permanenceStep = permanenceStep
        if (localisationStatus && localisationStatus !== 'all') params.localisationStatus = localisationStatus
        if (contactType && contactType !== 'all')   params.contactType = contactType
        if (ageRange)                               params.ageRange = ageRange
      }

      try {
        const cnt = await getFilteredContactsCount(params)
        setCurrentCount(cnt)
      } catch (err) {
        console.error('Error fetching live filtered count:', err)
      } finally {
        setIsCounting(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [chips, lastContactMobile, territory, tag, tagMode, supportLevel, creatorId, emailStatus, phoneStatus, gender, permanenceStep, localisationStatus, contactType, ageRange, mode, rules, activeTab, showAdvanced])

  // Sync state with URL
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setChips(buildChipsFromParams())
    setLastContactMobile(searchParams.get('lastContactMobile') || '')
    setTerritory(searchParams.get('territory') || '')
    setTag(searchParams.get('tag') || '')
    setTagMode(searchParams.get('tagMode') || 'or')
    setSupportLevel(searchParams.get('supportLevel') || '')
    setCreatorId(searchParams.get('creatorId') || '')
    setEmailStatus(searchParams.get('emailStatus') || 'all')
    setPhoneStatus(searchParams.get('phoneStatus') || 'all')
    setGender(searchParams.get('gender') || 'all')
    setPermanenceStep(searchParams.get('permanenceStep') || 'all')
    setLocalisationStatus(searchParams.get('localisationStatus') || 'all')
    setContactType(searchParams.get('contactType') || 'all')
    setAgeRange(searchParams.get('ageRange') || '')

    const rawRules = searchParams.get('advanced_rules')
    if (rawRules) {
      try {
        const parsed = JSON.parse(rawRules)
        setMode(parsed.mode || 'ayant')
        if (parsed.rules && parsed.rules.length > 0) {
          setRules(parsed.rules.map((r: any) => ({ ...r, id: r.id || crypto.randomUUID() })))
        }
        setActiveTab('advanced')
        setShowAdvanced(true)
      } catch (e) {
        console.error(e)
      }
    } else {
      setActiveTab('standard')
    }
  }, [searchParams])
  /* eslint-enable react-hooks/set-state-in-effect */

  const inputRef = useRef<HTMLInputElement>(null)

  const hasAdvancedFilters = lastContactMobile || territory || tag || supportLevel || creatorId ||
    (emailStatus !== 'all') || (phoneStatus !== 'all') || (gender !== 'all') || 
    (permanenceStep !== 'all') || (localisationStatus !== 'all') || (contactType !== 'all') || ageRange || searchParams.has('advanced_rules')

  // Build URL and navigate
  const buildAndNavigate = (newChips: Chip[], extraParams?: Record<string, string>) => {
    const params = new URLSearchParams()

    const byType = (type: ChipType) => newChips.filter(c => c.type === type).map(c => c.value).join(',')
    if (byType('city'))   params.set('city',    byType('city'))
    if (byType('phone'))  params.set('phone',   byType('phone'))
    if (byType('name'))   params.set('nameQ',   byType('name'))
    if (byType('street')) params.set('streetQ', byType('street'))

    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v && v !== 'all' && v !== '') {
          params.set(k, v)
        }
      })
    } else {
      if (lastContactMobile)   params.set('lastContactMobile', lastContactMobile)
      if (territory)           params.set('territory', territory)
      if (tag) {
        params.set('tag', tag)
        if (tagMode) params.set('tagMode', tagMode)
      }
      if (supportLevel)        params.set('supportLevel', supportLevel)
      if (creatorId)           params.set('creatorId', creatorId)
      if (emailStatus && emailStatus !== 'all')   params.set('emailStatus', emailStatus)
      if (phoneStatus && phoneStatus !== 'all')   params.set('phoneStatus', phoneStatus)
      if (gender && gender !== 'all')             params.set('gender', gender)
      if (permanenceStep && permanenceStep !== 'all') params.set('permanenceStep', permanenceStep)
      if (localisationStatus && localisationStatus !== 'all') params.set('localisationStatus', localisationStatus)
      if (contactType && contactType !== 'all')   params.set('contactType', contactType)
      if (ageRange)                               params.set('ageRange', ageRange)
    }

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

  const applySavedFilter = (payloadStr: string) => {
    try {
      const parsed = JSON.parse(payloadStr)
      const params = new URLSearchParams()
      Object.entries(parsed).forEach(([k, v]) => {
        if (v) params.set(k, v as string)
      })
      router.push(`/contacts?${params.toString()}`)
      setShowAdvanced(false)
    } catch (err) {
      console.error('Error applying saved filter:', err)
    }
  }

  const handleSaveFilter = async () => {
    if (!saveName.trim()) {
      setSaveError('Veuillez saisir un nom pour le filtre.')
      return
    }
    setIsSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    
    const payloadObj: Record<string, string> = {}
    const byType = (type: ChipType) => chips.filter(c => c.type === type).map(c => c.value).join(',')
    if (byType('city'))   payloadObj.city = byType('city')
    if (byType('phone'))  payloadObj.phone = byType('phone')
    if (byType('name'))   payloadObj.nameQ = byType('name')
    if (byType('street')) payloadObj.streetQ = byType('street')

    if (activeTab === 'advanced') {
      const rulesPayload = {
        mode,
        rules: rules.map(r => ({
          dataType: r.dataType,
          property: r.property,
          operator: r.operator,
          value: r.value,
          condition: r.condition,
        }))
      }
      payloadObj.advanced_rules = JSON.stringify(rulesPayload)
    } else {
      if (lastContactMobile)   payloadObj.lastContactMobile = lastContactMobile
      if (territory)           payloadObj.territory = territory
      if (tag) {
        payloadObj.tag = tag
        if (tagMode) payloadObj.tagMode = tagMode
      }
      if (supportLevel)        payloadObj.supportLevel = supportLevel
      if (creatorId)           payloadObj.creatorId = creatorId
      if (emailStatus && emailStatus !== 'all')   payloadObj.emailStatus = emailStatus
      if (phoneStatus && phoneStatus !== 'all')   payloadObj.phoneStatus = phoneStatus
      if (gender && gender !== 'all')             payloadObj.gender = gender
      if (permanenceStep && permanenceStep !== 'all') payloadObj.permanenceStep = permanenceStep
      if (localisationStatus && localisationStatus !== 'all') payloadObj.localisationStatus = localisationStatus
      if (contactType && contactType !== 'all')   payloadObj.contactType = contactType
      if (ageRange)                               payloadObj.ageRange = ageRange
    }

    try {
      const { createSavedFilter } = await import('./filters-actions')
      const res = await createSavedFilter(saveName, saveDescription, JSON.stringify(payloadObj), saveShared)
      if (res.success) {
        setSaveSuccess(true)
        setSaveName('')
        setSaveDescription('')
        setSaveShared(false)
        setShowSaveSection(false)
        router.refresh()
      } else {
        setSaveError(res.error || 'Erreur lors de la sauvegarde.')
      }
    } catch (err: any) {
      setSaveError(err.message || 'Erreur interne.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFilter = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce filtre enregistré ?')) return
    try {
      const { deleteSavedFilter } = await import('./filters-actions')
      const res = await deleteSavedFilter(id)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || 'Erreur lors de la suppression.')
      }
    } catch (err: any) {
      alert(err.message || 'Erreur interne.')
    }
  }

  const getActiveFilterBadges = () => {
    const badges: { key: string; label: string; remove: () => void }[] = []
    
    const p = searchParams
    
    if (p.get('tag')) {
      const modeText = p.get('tagMode') === 'and' ? 'ET' : p.get('tagMode') === 'not' ? 'SANS' : 'OU'
      badges.push({
        key: 'tag',
        label: `Tags (${modeText}) : ${p.get('tag')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('tag')
          params.delete('tagMode')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('supportLevel')) {
      badges.push({
        key: 'supportLevel',
        label: `Soutien : ${p.get('supportLevel')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('supportLevel')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('contactType')) {
      badges.push({
        key: 'contactType',
        label: `Type : ${p.get('contactType')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('contactType')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('ageRange')) {
      badges.push({
        key: 'ageRange',
        label: `Âge : ${p.get('ageRange')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('ageRange')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('territory')) {
      badges.push({
        key: 'territory',
        label: `Territoire : ${p.get('territory')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('territory')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('creatorId')) {
      const creator = teamMembers.find(m => m.id === p.get('creatorId'))
      const name = creator ? `${creator.firstName} ${creator.lastName}` : p.get('creatorId')
      badges.push({
        key: 'creatorId',
        label: `Créé par : ${name}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('creatorId')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('emailStatus') && p.get('emailStatus') !== 'all') {
      const val = p.get('emailStatus') === 'has_email' ? 'Avec email' : 'Sans email'
      badges.push({
        key: 'emailStatus',
        label: `Email : ${val}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('emailStatus')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('phoneStatus') && p.get('phoneStatus') !== 'all') {
      const val = p.get('phoneStatus') === 'mobile' ? 'Mobile' : p.get('phoneStatus') === 'any' ? 'Avec tél.' : 'Sans tél.'
      badges.push({
        key: 'phoneStatus',
        label: `Tél : ${val}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('phoneStatus')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('gender') && p.get('gender') !== 'all') {
      badges.push({
        key: 'gender',
        label: `Genre : ${p.get('gender')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('gender')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('permanenceStep') && p.get('permanenceStep') !== 'all') {
      badges.push({
        key: 'permanenceStep',
        label: `Perm. : ${p.get('permanenceStep')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('permanenceStep')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('localisationStatus') && p.get('localisationStatus') !== 'all') {
      badges.push({
        key: 'localisationStatus',
        label: `Localisation : ${p.get('localisationStatus')}`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('localisationStatus')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    if (p.get('advanced_rules')) {
      badges.push({
        key: 'advanced_rules',
        label: `Filtres avancés`,
        remove: () => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('advanced_rules')
          router.push(`/contacts?${params.toString()}`)
        }
      })
    }
    
    return badges
  }

  // Reset all filters
  const resetAll = () => {
    setChips([])
    setInputValue('')
    setLastContactMobile('')
    setTerritory('')
    setTag('')
    setTagMode('or')
    setSupportLevel('')
    setCreatorId('')
    setEmailStatus('all')
    setPhoneStatus('all')
    setGender('all')
    setPermanenceStep('all')
    setLocalisationStatus('all')
    setContactType('all')
    setAgeRange('')
    setRules([
      { id: crypto.randomUUID(), dataType: 'contacts', property: 'lastName', operator: 'contains', value: '', condition: 'AND' }
    ])
    setMode('ayant')
    router.push('/contacts')
    setShowAdvanced(false)
  }

  // Apply filters action
  const applyFilters = () => {
    if (activeTab === 'advanced') {
      const rulesPayload = {
        mode,
        rules: rules.map(r => ({
          dataType: r.dataType,
          property: r.property,
          operator: r.operator,
          value: r.value,
          condition: r.condition,
        }))
      }
      const params = new URLSearchParams()
      params.set('advanced_rules', JSON.stringify(rulesPayload))
      router.push(`/contacts?${params.toString()}`)
    } else {
      const params: Record<string, string> = {
        lastContactMobile,
        territory,
        tag,
        tagMode,
        supportLevel,
        creatorId,
        emailStatus,
        phoneStatus,
        gender,
        permanenceStep,
        localisationStatus,
        contactType,
        ageRange,
      }
      buildAndNavigate(chips, params)
    }
    setShowAdvanced(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      addChip(inputValue, detectType(inputValue, cityNames))
    }
    if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      removeChip(chips[chips.length - 1].id)
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setInputValue('')
    }
  }

  // Rule modifiers
  const addRule = () => {
    setRules([...rules, { id: crypto.randomUUID(), dataType: 'contacts', property: 'lastName', operator: 'contains', value: '', condition: 'AND' }])
  }

  const deleteRule = (id: string) => {
    if (rules.length > 1) {
      setRules(rules.filter(r => r.id !== id))
    }
  }

  const updateRule = (id: string, updates: Partial<any>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const handleDataTypeChange = (id: string, dataType: string) => {
    const opts = getPropertyOptions(dataType)
    const defaultProp = opts[0]?.value || ''
    updateRule(id, { dataType, property: defaultProp, value: '' })
  }

  const totalActiveFilters = chips.length + (hasAdvancedFilters ? 1 : 0)

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ─── Main Search Bar ─── */}
      <div className="card" style={{ padding: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.25rem' }} />

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

          {showSuggestions && inputValue.length >= 1 && (
            <Suggestions
              query={inputValue}
              uniqueCities={uniqueCities}
              onSelect={(v, t) => { addChip(v, t); inputRef.current?.focus() }}
            />
          )}
        </div>

        {chips.length > 0 && (
          <button
            onClick={resetAll}
            title="Effacer la recherche"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        )}

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ position: 'relative' }}>
              <select
                onChange={e => {
                  if (e.target.value) {
                    applySavedFilter(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
                style={{
                  padding: '0.4rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  color: 'var(--text-muted)',
                  outline: 'none',
                  maxWidth: '180px'
                }}
              >
                <option value="" disabled>💾 Filtres sauv.</option>
                {savedFilters.map(f => (
                  <option key={f.id} value={f.payload}>
                    {f.name} {f.isShared ? '👥' : '🔒'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

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
            backgroundColor: showAdvanced || hasAdvancedFilters ? 'var(--sidebar-bg)' : 'transparent',
            color: showAdvanced || hasAdvancedFilters ? 'white' : 'var(--text-muted)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={14} />
          {hasAdvancedFilters ? `Filtres (${totalActiveFilters})` : 'Filtres'}
        </button>
      </div>

      {/* ─── Active Filter Pills ─── */}
      {getActiveFilterBadges().length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
          marginTop: '0.5rem', padding: '0.25rem 0.5rem'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filtres actifs :</span>
          {getActiveFilterBadges().map(badge => (
            <span
              key={badge.key}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                fontSize: '0.76rem', fontWeight: 600,
                backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569'
              }}
            >
              {badge.label}
              <button
                onClick={badge.remove}
                title="Supprimer ce filtre"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0,
                  color: '#94a3b8'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <button
            onClick={resetAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.76rem', color: '#ef4444', fontWeight: 600,
              textDecoration: 'underline', padding: '0.2rem'
            }}
          >
            Tout effacer
          </button>
        </div>
      )}

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

      {/* ─── Advanced Filters Drawer (collapsible card) ─── */}
      {showAdvanced && (
        <div className="card" style={{ marginTop: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          
          {/* Header with pill tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '3px', borderRadius: '999px' }}>
              <button
                onClick={() => setActiveTab('standard')}
                style={{
                  padding: '0.45rem 1.25rem', borderRadius: '999px', border: 'none', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer',
                  background: activeTab === 'standard' ? 'var(--sidebar-bg)' : 'transparent',
                  color: activeTab === 'standard' ? 'white' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                Filtres
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                style={{
                  padding: '0.45rem 1.25rem', borderRadius: '999px', border: 'none', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer',
                  background: activeTab === 'advanced' ? 'var(--sidebar-bg)' : 'transparent',
                  color: activeTab === 'advanced' ? 'white' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                Filtres avancés
              </button>
            </div>

            <button
              onClick={() => setShowAdvanced(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Content 1 : Standard Filters */}
          {activeTab === 'standard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Row 1 : Selects and date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Dernier contact via mobile
                  </label>
                  <input
                    type="date"
                    value={lastContactMobile}
                    onChange={e => setLastContactMobile(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Territoire
                  </label>
                  <select
                    value={territory}
                    onChange={e => setTerritory(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="">Choisir</option>
                    {uniqueTerritories.map(t => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Tags
                  </label>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', maxHeight: '120px', overflowY: 'auto', background: 'white' }}>
                    {allTags.map(t => {
                      const selectedTags = tag.split(',').filter(Boolean)
                      const isChecked = selectedTags.includes(t.name)
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '4px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              let newTags = [...selectedTags]
                              if (e.target.checked) {
                                newTags.push(t.name)
                              } else {
                                newTags = newTags.filter(x => x !== t.name)
                              }
                              setTag(newTags.join(','))
                            }}
                            style={{ accentColor: '#ec4899' }}
                          />
                          <span>{t.name} ({t.count})</span>
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '0.4rem' }}>
                    {['or', 'and', 'not'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTagMode(mode)}
                        style={{
                          flex: 1,
                          padding: '3px 6px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          backgroundColor: tagMode === mode ? '#ec4899' : 'white',
                          color: tagMode === mode ? 'white' : '#475569',
                          transition: 'all 0.15s'
                        }}
                      >
                        {mode === 'or' ? 'OU' : mode === 'and' ? 'ET' : 'SANS'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Niveau de soutien
                  </label>
                  <select
                    value={supportLevel}
                    onChange={e => setSupportLevel(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="">Choisir</option>
                    {supportLevels.map(sl => (
                      <option key={sl.value} value={sl.value}>{sl.label} ({sl.count})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Type de contact
                  </label>
                  <select
                    value={contactType}
                    onChange={e => setContactType(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="all">Tous les types</option>
                    {contactTypes.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label} ({ct.count})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Tranche d'âge
                  </label>
                  <select
                    value={ageRange}
                    onChange={e => setAgeRange(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="">Choisir</option>
                    {ageRanges.map(ar => (
                      <option key={ar.value} value={ar.value}>{ar.value} ({ar.count})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 : Radios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                {/* Membres de mon équipe */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Membres de mon équipe
                  </label>
                  <select
                    value={creatorId}
                    onChange={e => setCreatorId(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                  >
                    <option value="">Choisir</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.count})</option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Email
                  </label>
                  <div>
                    {[
                      { val: 'has_email', lbl: 'Renseigné' },
                      { val: 'no_email', lbl: 'Non renseigné' },
                      { val: 'all', lbl: 'Tous les citoyens' },
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#334155', cursor: 'pointer', marginBottom: '0.35rem' }}>
                        <input type="radio" name="emailStatus" checked={emailStatus === opt.val} onChange={() => setEmailStatus(opt.val)} style={{ accentColor: '#ec4899' }} />
                        {opt.lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Téléphone
                  </label>
                  <div>
                    {[
                      { val: 'mobile', lbl: 'Champ mobile renseigné' },
                      { val: 'any', lbl: 'Champ fixe ou mobile renseigné' },
                      { val: 'none', lbl: 'Non renseigné' },
                      { val: 'all', lbl: 'Tous les citoyens' },
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#334155', cursor: 'pointer', marginBottom: '0.35rem' }}>
                        <input type="radio" name="phoneStatus" checked={phoneStatus === opt.val} onChange={() => setPhoneStatus(opt.val)} style={{ accentColor: '#ec4899' }} />
                        {opt.lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Genre */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Genre
                  </label>
                  <div>
                    {[
                      { val: 'F', lbl: 'Femmes' },
                      { val: 'H', lbl: 'Hommes' },
                      { val: 'Autre', lbl: 'Autre' },
                      { val: 'all', lbl: 'Tous les citoyens' },
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#334155', cursor: 'pointer', marginBottom: '0.35rem' }}>
                        <input type="radio" name="genderStatus" checked={gender === opt.val} onChange={() => setGender(opt.val)} style={{ accentColor: '#ec4899' }} />
                        {opt.lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Étape de la permanence */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Étape de la permanence
                  </label>
                  <div>
                    {[
                      { val: 'to_do', lbl: 'À faire' },
                      { val: 'upcoming', lbl: 'À venir' },
                      { val: 'in_progress', lbl: 'En cours' },
                      { val: 'response', lbl: 'Réponse' },
                      { val: 'not_contacted', lbl: 'Pas encore contactés' },
                      { val: 'all', lbl: 'Tous les citoyens' },
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#334155', cursor: 'pointer', marginBottom: '0.35rem' }}>
                        <input type="radio" name="permanenceStepStatus" checked={permanenceStep === opt.val} onChange={() => setPermanenceStep(opt.val)} style={{ accentColor: '#ec4899' }} />
                        {opt.lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Localisation */}
                <div>
                  <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Localisation
                  </label>
                  <div>
                    {[
                      { val: 'transmitted', lbl: 'Adresse transmise' },
                      { val: 'all', lbl: 'Tous les citoyens' },
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#334155', cursor: 'pointer', marginBottom: '0.35rem' }}>
                        <input type="radio" name="localisationStatus" checked={localisationStatus === opt.val} onChange={() => setLocalisationStatus(opt.val)} style={{ accentColor: '#ec4899' }} />
                        {opt.lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3 : Réponse aux questions */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <label style={{ display: 'block', color: '#ec4899', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Réponse aux questions
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>À la question</span>
                  <select style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'white' }}>
                    <option>Choisir une question</option>
                    <option>Intérêt pour les réunions publiques ?</option>
                    <option>Soutien à la candidature ?</option>
                    <option>Souhait de recevoir la newsletter ?</option>
                  </select>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>je recherche les personnes qui</span>
                  <select style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'white' }}>
                    <option>Choisir un type de réponse</option>
                    <option>ont répondu</option>
                    <option>n'ont pas répondu</option>
                    <option>ont répondu exactement</option>
                  </select>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>cette réponse</span>
                  <select style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'white' }}>
                    <option>Choisir une réponse</option>
                    <option>Oui</option>
                    <option>Non</option>
                    <option>Peut-être</option>
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* Tab Content 2 : Advanced Filters */}
          {activeTab === 'advanced' && (
            <div>
              {/* Ayant / Sans Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#334155' }}>Je veux des contacts</span>
                <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
                  <button
                    onClick={() => setMode('ayant')}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                      background: mode === 'ayant' ? '#22c55e' : 'transparent',
                      color: mode === 'ayant' ? 'white' : '#64748b',
                      transition: 'all 0.15s'
                    }}
                  >
                    ayant
                  </button>
                  <button
                    onClick={() => setMode('sans')}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                      background: mode === 'sans' ? '#64748b' : 'transparent',
                      color: mode === 'sans' ? 'white' : '#64748b',
                      transition: 'all 0.15s'
                    }}
                  >
                    sans
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rules.map((rule, idx) => (
                  <div key={rule.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    
                    {/* Inline and/or separator */}
                    {idx > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                        <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '2px', borderRadius: '6px', width: '80px' }}>
                          <button
                            onClick={() => updateRule(rule.id, { condition: 'AND' })}
                            style={{
                              flex: 1, padding: '0.25rem', borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              background: rule.condition === 'AND' ? '#22c55e' : 'transparent',
                              color: rule.condition === 'AND' ? 'white' : '#64748b',
                              transition: 'all 0.15s'
                            }}
                          >
                            ET
                          </button>
                          <button
                            onClick={() => updateRule(rule.id, { condition: 'OR' })}
                            style={{
                              flex: 1, padding: '0.25rem', borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              background: rule.condition === 'OR' ? '#22c55e' : 'transparent',
                              color: rule.condition === 'OR' ? 'white' : '#64748b',
                              transition: 'all 0.15s'
                            }}
                          >
                            OU
                          </button>
                        </div>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                      </div>
                    )}

                    {/* Rule Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr auto', gap: '0.75rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      
                      {/* Property */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Champ ciblé</label>
                        <select
                          value={rule.property}
                          onChange={e => handleDataTypeChange(rule.id, e.target.value)}
                          className="form-control"
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                        >
                          {getPropertyOptions(rule.dataType).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Operator */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Opérateur</label>
                        <select
                          value={rule.operator}
                          onChange={e => updateRule(rule.id, { operator: e.target.value })}
                          className="form-control"
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                        >
                          <option value="contains">contient</option>
                          <option value="notContains">ne contient pas</option>
                          <option value="equals">est égal à</option>
                          <option value="isEmpty">est vide</option>
                          <option value="isNotEmpty">est renseigné</option>
                        </select>
                      </div>

                      {/* Value */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Valeur</label>
                        {rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty' ? (
                          <input
                            type="text"
                            disabled
                            value="(sans valeur)"
                            className="form-control"
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem', background: '#f1f5f9' }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={rule.value}
                            onChange={e => updateRule(rule.id, { value: e.target.value })}
                            placeholder="Saisir une valeur..."
                            className="form-control"
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                          />
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteRule(rule.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', paddingBottom: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add rule buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={addRule}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none',
                    color: '#ec4899', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', width: 'fit-content'
                  }}
                >
                  <Plus size={14} /> Ajouter un filtre
                </button>
                <button
                  type="button"
                  onClick={addRule}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none',
                    color: '#ec4899', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', width: 'fit-content'
                  }}
                >
                  <Plus size={14} /> Ajouter un groupe de filtres
                </button>
              </div>

            </div>
          )}

          {/* Section : Recherches enregistrées */}
          <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>💾 Recherches enregistrées</span>
              <button
                type="button"
                onClick={() => setShowSaveSection(!showSaveSection)}
                style={{
                  background: 'none', border: 'none', color: '#ec4899',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                {showSaveSection ? 'Annuler' : 'Enregistrer ces filtres'}
              </button>
            </div>

            {showSaveSection && (
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '1rem' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Nom du filtre</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="ex: Électeurs +65 ans"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description (facultative)</label>
                  <input
                    type="text"
                    value={saveDescription}
                    onChange={e => setSaveDescription(e.target.value)}
                    placeholder="ex: Utilisé pour le publipostage"
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                  />
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id="saveSharedCb"
                    checked={saveShared}
                    onChange={e => setSaveShared(e.target.checked)}
                    style={{ accentColor: '#ec4899' }}
                  />
                  <label htmlFor="saveSharedCb" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    Partager ce filtre avec l'équipe 👥
                  </label>
                </div>
                {saveError && <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: '0 0 8px 0' }}>{saveError}</p>}
                <button
                  type="button"
                  onClick={handleSaveFilter}
                  disabled={isSaving}
                  style={{
                    width: '100%', padding: '0.45rem', fontSize: '0.8rem', fontWeight: 600,
                    backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            )}

            {savedFilters.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                {savedFilters.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name} {f.isShared ? '👥' : '🔒'}
                      </span>
                      {f.description && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => applySavedFilter(f.payload)}
                        style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Appliquer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFilter(f.id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Aucun filtre enregistré.</p>
            )}
          </div>

          {/* Drawer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={resetAll}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
            >
              Réinitialiser les filtres
            </button>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {activeTab === 'advanced' && (
                <button
                  onClick={() => alert("Liste enregistrée avec succès !")}
                  style={{
                    background: '#e2e8f0', color: '#475569', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#cbd5e1')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#e2e8f0')}
                >
                  Créer une liste
                </button>
              )}

              <button
                onClick={applyFilters}
                style={{
                  background: 'var(--sidebar-bg)', color: 'white', border: 'none', padding: '0.55rem 1.5rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  opacity: isCounting ? 0.7 : 1
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--sidebar-bg)')}
                disabled={isCounting}
              >
                {isCounting ? 'Calcul en cours...' : `${currentCount.toLocaleString('fr-FR')} résultats`}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
