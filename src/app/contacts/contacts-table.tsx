'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Edit2, Download, GitMerge, Trash2, X,
  Settings2, ChevronDown, CheckSquare, Square,
  FileText, Table2, Loader2, Phone, FolderPlus, Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { getContactLists, addContactsToListBulk, createContactListBulk } from './lists/actions'

// ── Utilitaire : couleur de texte lisible sur un fond donné ──
// Retourne '#fff' ou '#1e293b' selon la luminance du fond
function getContrastText(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  if (hex.length < 6) return '#1e293b'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Luminance relative (formule W3C)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1e293b' : '#ffffff'
}

// ──────────────────────────────────────────────────────────
// Column definitions
// ──────────────────────────────────────────────────────────
type Column = { id: string; label: string; defaultVisible: boolean }

const ALL_COLUMNS: Column[] = [
  { id: 'firstName',         label: 'Prénom',                defaultVisible: true  },
  { id: 'lastName',          label: 'Nom',                   defaultVisible: true  },
  { id: 'usageName',         label: 'Nom d\'usage',          defaultVisible: true  },
  { id: 'streetNumber',      label: 'Numéro',                defaultVisible: true  },
  { id: 'apartment',         label: 'Porte',                 defaultVisible: true  },
  { id: 'building',          label: 'Bâtiment',              defaultVisible: true  },
  { id: 'addressComplement', label: 'Complément d\'adresse', defaultVisible: true  },
  { id: 'streetName',        label: 'Rue / Voie',            defaultVisible: true  },
  { id: 'city',              label: 'Ville',                 defaultVisible: true  },
  { id: 'territorySector',   label: 'Territoire',            defaultVisible: true  },
  { id: 'postalCode',        label: 'Code postal',           defaultVisible: false },
  { id: 'email',             label: 'Email',                 defaultVisible: false },
  { id: 'mobilePhone',       label: 'Portable',              defaultVisible: false },
  { id: 'phone',             label: 'Tél. fixe',             defaultVisible: false },
  { id: 'gender',            label: 'Genre',                 defaultVisible: false },
  { id: 'supportLevel',      label: 'Niveau soutien',        defaultVisible: false },
  { id: 'meetingStep',       label: 'Étape rencontre',       defaultVisible: false },
  { id: 'tags',              label: 'Tags',                  defaultVisible: false },
  { id: 'type',              label: 'Type',                  defaultVisible: false },
  { id: 'profession',        label: 'Profession',            defaultVisible: false },
  { id: 'createdAt',         label: 'Créé le',               defaultVisible: false },
]

function renderCell(contact: any, columnId: string): React.ReactNode {
  switch (columnId) {
    case 'firstName':         return contact.firstName || '-'
    case 'lastName':          return contact.lastName || '-'
    case 'usageName':         return contact.usageName || '-'
    case 'streetNumber':      return contact.streetNumber || '-'
    case 'apartment':         return contact.apartment || '-'
    case 'building':          return contact.building || '-'
    case 'addressComplement': return contact.addressComplement || '-'
    case 'streetName':        return contact.streetName || '-'
    case 'city':              return contact.city || '-'
    case 'territorySector':   return contact.territorySector || '-'
    case 'postalCode':        return contact.postalCode || '-'
    case 'email':             return contact.email || '-'
    case 'mobilePhone':       return contact.mobilePhone || '-'
    case 'phone':             return contact.phone || '-'
    case 'gender':            return contact.gender || '-'
    case 'supportLevel':      return contact.supportLevel || '-'
    case 'meetingStep':       return contact.meetingStep || '-'
    case 'type':              return contact.type || '-'
    case 'profession':        return contact.profession || '-'
    case 'createdAt':         return new Date(contact.createdAt).toLocaleDateString('fr-FR')
    case 'tags':
      if (!contact.tags?.length) return '-'
      return (
        <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {contact.tags.map((t: any) => {
            const bg      = t.tag.color || '#6366f1'
            const textCol = getContrastText(bg)
            return (
              <span
                key={t.tag.id}
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: bg,
                  color: textCol,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.tag.name}
              </span>
            )
          })}
        </span>
      )
    default: return '-'
  }
}

// ──────────────────────────────────────────────────────────
// Export dropdown
// ──────────────────────────────────────────────────────────
function ExportDropdown({
  selectedIds,
  allFiltered,
  totalFiltered,
  filterParams,
}: {
  selectedIds: Set<string>
  allFiltered: boolean
  totalFiltered: number
  filterParams: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const buildExportUrl = (format: 'csv' | 'xls') => {
    const params = new URLSearchParams(filterParams)
    params.set('format', format)
    if (!allFiltered && selectedIds.size > 0) {
      params.set('ids', Array.from(selectedIds).join(','))
    }
    return `/api/contacts/export?${params.toString()}`
  }

  const count = allFiltered ? totalFiltered : selectedIds.size
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 10px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.83rem',
          color: '#374151',
          fontWeight: 500,
        }}
      >
        <Download size={14} />
        Exporter
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100, minWidth: '200px', overflow: 'hidden',
        }}>
          <a
            href={buildExportUrl('csv')}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', color: '#374151',
              textDecoration: 'none', fontSize: '0.85rem',
              borderBottom: '1px solid #f1f5f9',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <FileText size={15} style={{ color: '#22c55e' }} />
            <span>
              Exporter CSV
              <span style={{ color: '#94a3b8', marginLeft: '4px', fontSize: '0.78rem' }}>({count})</span>
            </span>
          </a>
          <a
            href={buildExportUrl('xls')}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', color: '#374151',
              textDecoration: 'none', fontSize: '0.85rem',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Table2 size={15} style={{ color: '#3b82f6' }} />
            <span>
              Exporter XLS
              <span style={{ color: '#94a3b8', marginLeft: '4px', fontSize: '0.78rem' }}>({count})</span>
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Send to Phoning dropdown
// ──────────────────────────────────────────────────────────
function SendToPhoningDropdown({
  selectedIds,
  onSuccess,
}: {
  selectedIds: Set<string>
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [permanences, setPermanences] = useState<{ id: string; title: string; scheduledStartDate: Date }[]>([])
  const [result, setResult] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchPermanences = async () => {
    try {
      const { getActivePermanences } = await import('../permanences/actions')
      const perms = await getActivePermanences()
      setPermanences(perms as any)
    } catch {}
  }

  const handleOpen = () => {
    if (!open) fetchPermanences()
    setOpen(!open)
    setResult(null)
  }

  const handleSend = async (permanenceId: string) => {
    if (selectedIds.size === 0) return
    setLoading(true)
    setResult(null)
    try {
      const { bulkAddContactsToPhoning } = await import('../permanences/actions')
      const res = await bulkAddContactsToPhoning(permanenceId, [...selectedIds])
      if (res.success && res.data) {
        setResult(`✓ ${res.data.added} ajouté(s), ${res.data.skipped} ignoré(s) (déjà présents).`)
      } else {
        setResult(`Erreur : ${res.error}`)
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const disabled = selectedIds.size === 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 10px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          background: disabled ? 'white' : '#eff6ff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.83rem',
          color: disabled ? '#94a3b8' : '#2563eb',
          fontWeight: 500,
          borderColor: disabled ? '#e2e8f0' : '#bfdbfe',
        }}
      >
        <Phone size={14} />
        Phoning
        <ChevronDown size={12} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          zIndex: 200, minWidth: '280px', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Envoyer {selectedIds.size} contact(s) vers le phoning de :
          </div>

          {result && (
            <div style={{ padding: '8px 14px', background: result.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: result.startsWith('✓') ? '#065f46' : '#991b1b', fontSize: '0.82rem' }}>
              {result}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Envoi en cours...</div>
          ) : permanences.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Aucune permanence active</div>
          ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {permanences.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSend(p.id)}
                  style={{
                    width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '10px 14px', border: 'none', background: 'white', cursor: 'pointer',
                    borderBottom: '1px solid #f8fafc', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{p.title}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(p.scheduledStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Column configurator
// ──────────────────────────────────────────────────────────
function ColumnConfigurator({
  visibleColumns,
  onToggle,
}: {
  visibleColumns: string[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title="Configurer les colonnes"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 10px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.83rem',
          color: '#64748b',
        }}
      >
        <Settings2 size={14} />
        Colonnes
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100, width: '280px', padding: '12px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
        }}>
          {ALL_COLUMNS.map(col => (
            <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => onToggle(col.id)}
                style={{ accentColor: 'var(--primary)' }}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main table component
// ──────────────────────────────────────────────────────────
interface ContactsTableProps {
  contacts: any[]
  totalContacts: number
  filterParams: string  // serialized URLSearchParams for export
}

export default function ContactsTable({ contacts, totalContacts, filterParams }: ContactsTableProps) {
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allFiltered, setAllFiltered] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // List management states
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [existingLists, setExistingLists] = useState<any[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [isSubmittingList, setIsSubmittingList] = useState(false)
  const [listMode, setListMode] = useState<'existing' | 'new'>('existing')

  useEffect(() => {
    if (isListModalOpen) {
      getContactLists().then(lists => {
        setExistingLists(lists)
        if (lists.length > 0) {
          setSelectedListId(lists[0].id)
        }
      })
    }
  }, [isListModalOpen])

  const handleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingList(true)
    try {
      if (listMode === 'existing') {
        if (!selectedListId) {
          toast.error('Veuillez sélectionner une liste.')
          setIsSubmittingList(false)
          return
        }
        const res = await addContactsToListBulk(selectedListId, Array.from(selectedIds), filterParams, allFiltered)
        if (res.success) {
          toast.success('Contacts ajoutés à la liste avec succès !')
          setIsListModalOpen(false)
          clearSelection()
          router.refresh()
        } else {
          toast.error(res.error || "Une erreur s'est produite.")
        }
      } else {
        if (!newListName.trim()) {
          toast.error('Le nom de la liste est obligatoire.')
          setIsSubmittingList(false)
          return
        }
        const res = await createContactListBulk(newListName, newListDescription, Array.from(selectedIds), filterParams, allFiltered)
        if (res.success) {
          toast.success('Liste créée et contacts ajoutés avec succès !')
          setIsListModalOpen(false)
          setNewListName('')
          setNewListDescription('')
          clearSelection()
          router.refresh()
        } else {
          toast.error(res.error || "Une erreur s'est produite.")
        }
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Une erreur s'est produite.")
    } finally {
      setIsSubmittingList(false)
    }
  }

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contactColumns_v2')
      if (saved) { try { return JSON.parse(saved) } catch {} }
    }
    return ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  })

  useEffect(() => {
    localStorage.setItem('contactColumns_v2', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const visibleCols = ALL_COLUMNS.filter(c => visibleColumns.includes(c.id))

  // Selection helpers
  const isAllPageSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))
  const isIndeterminate = selectedIds.size > 0 && !isAllPageSelected

  const toggleAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(new Set())
      setAllFiltered(false)
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      if (!next.has(id)) setAllFiltered(false)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(contacts.map(c => c.id)))
    setAllFiltered(true)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setAllFiltered(false)
  }

  // Bulk archive
  const handleBulkArchive = async () => {
    const count = allFiltered ? totalContacts : selectedIds.size
    const msg = allFiltered
      ? `Archiver TOUS les ${totalContacts} contacts correspondant aux filtres ? Cette action est irréversible.`
      : `Archiver ${selectedIds.size} contact(s) sélectionné(s) ?`
    if (!confirm(msg)) return

    setArchiving(true)
    try {
      const { archiveContactsBulk } = await import('./actions')
      if (allFiltered) {
        // Pass a special marker; server action handles it by filter params
        await archiveContactsBulk([...selectedIds], filterParams, allFiltered)
      } else {
        await archiveContactsBulk([...selectedIds], filterParams, false)
      }
      clearSelection()
      router.refresh()
    } finally {
      setArchiving(false)
    }
  }

  const selectedCount = allFiltered ? totalContacts : selectedIds.size

  // ── Render ──
  return (
    <div>
      {/* ─── Toolbar ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}>
        {/* Selection counter */}
        {selectedIds.size > 0 ? (
          <span style={{
            fontSize: '0.83rem',
            fontWeight: 600,
            color: 'var(--primary)',
            background: '#eff6ff',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
          }}>
            {allFiltered ? `Tous les ${totalContacts} contacts sélectionnés` : `${selectedIds.size} sélectionné(s)`}
          </span>
        ) : null}

        {/* Action buttons — always shown, disabled when no selection */}
        <button
          onClick={() => selectedIds.size === 1 && router.push(`/contacts/${[...selectedIds][0]}/edit`)}
          disabled={selectedIds.size !== 1}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            cursor: selectedIds.size === 1 ? 'pointer' : 'not-allowed',
            fontSize: '0.83rem',
            color: selectedIds.size === 1 ? '#374151' : '#94a3b8',
            fontWeight: 500,
          }}
        >
          <Edit2 size={14} /> Éditer
        </button>

        <ExportDropdown
          selectedIds={selectedIds}
          allFiltered={allFiltered}
          totalFiltered={totalContacts}
          filterParams={filterParams}
        />

        <button
          onClick={() => {
            if (selectedIds.size === 2) {
              const [id1, id2] = [...selectedIds]
              router.push(`/contacts/duplicates/merge?a=${id1}&b=${id2}`)
            }
          }}
          disabled={selectedIds.size !== 2}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            cursor: selectedIds.size === 2 ? 'pointer' : 'not-allowed',
            fontSize: '0.83rem',
            color: selectedIds.size === 2 ? '#374151' : '#94a3b8',
            fontWeight: 500,
          }}
        >
          <GitMerge size={14} /> Fusionner
        </button>

        <button
          onClick={handleBulkArchive}
          disabled={selectedIds.size === 0 || archiving}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
            fontSize: '0.83rem',
            color: selectedIds.size > 0 ? '#ef4444' : '#94a3b8',
            fontWeight: 500,
          }}
        >
          {archiving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Supprimer
        </button>

        <SendToPhoningDropdown
          selectedIds={selectedIds}
          onSuccess={clearSelection}
        />

        <button
          onClick={() => {
            if (allFiltered) {
              router.push(`/contacts/communication?all=true&filterParams=${encodeURIComponent(filterParams)}`)
            } else {
              router.push(`/contacts/communication?ids=${Array.from(selectedIds).join(',')}`)
            }
          }}
          disabled={selectedIds.size === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: selectedIds.size > 0 ? '#eff6ff' : 'white',
            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
            fontSize: '0.83rem',
            color: selectedIds.size > 0 ? '#2563eb' : '#94a3b8',
            fontWeight: 500,
            borderColor: selectedIds.size > 0 ? '#bfdbfe' : '#e2e8f0',
          }}
        >
          <Mail size={14} /> Message groupé
        </button>

        <button
          onClick={() => setIsListModalOpen(true)}
          disabled={selectedIds.size === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: selectedIds.size > 0 ? '#f0fdf4' : 'white',
            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
            fontSize: '0.83rem',
            color: selectedIds.size > 0 ? '#16a34a' : '#94a3b8',
            fontWeight: 500,
            borderColor: selectedIds.size > 0 ? '#bbf7d0' : '#e2e8f0',
          }}
        >
          <FolderPlus size={14} /> Ajouter à une liste
        </button>

        {/* Clear selection */}
        {selectedIds.size > 0 && (
          <button
            onClick={clearSelection}
            title="Désélectionner tout"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Column configurator */}
        <ColumnConfigurator visibleColumns={visibleColumns} onToggle={toggleColumn} />
      </div>

      {/* ─── Select all filtered banner ─── */}
      {isAllPageSelected && !allFiltered && totalContacts > contacts.length && (
        <div style={{
          padding: '8px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span>
            Les <strong>{contacts.length}</strong> contacts de cette page sont sélectionnés.
          </span>
          <button
            onClick={selectAllFiltered}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline',
              fontSize: '0.85rem', padding: 0,
            }}
          >
            Sélectionner les {totalContacts.toLocaleString('fr-FR')} contacts correspondant aux filtres
          </button>
        </div>
      )}

      {allFiltered && (
        <div style={{
          padding: '8px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span>
            Tous les <strong>{totalContacts.toLocaleString('fr-FR')}</strong> contacts correspondant aux filtres sont sélectionnés.
          </span>
          <button
            onClick={clearSelection}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#16a34a', fontWeight: 700, textDecoration: 'underline',
              fontSize: '0.85rem', padding: 0,
            }}
          >
            Effacer la sélection
          </button>
        </div>
      )}

      {/* ─── Table ─── */}
      <div style={{ overflowX: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              {/* Master checkbox */}
              <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center', background: '#f8fafc' }}>
                <input
                  type="checkbox"
                  ref={el => {
                    if (el) {
                      el.checked = isAllPageSelected;
                      el.indeterminate = isIndeterminate;
                    }
                  }}
                  onChange={toggleAll}
                  className="contact-cb master-cb"
                  title="Tout sélectionner sur cette page"
                />
              </th>

              {visibleCols.map(col => (
                <th
                  key={col.id}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    whiteSpace: 'nowrap' as const,
                    background: '#f8fafc',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + 1} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Aucun contact trouvé.
                </td>
              </tr>
            ) : contacts.map((contact, i) => {
              const isSelected = selectedIds.has(contact.id)
              return (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                >
                  {/* Row checkbox */}
                  <td
                    style={{ padding: '9px 12px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation()
                      // We handle the toggle via onChange on the input, 
                      // but if they click the cell padding, we toggle too.
                      if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        toggleRow(contact.id, e)
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => toggleRow(contact.id, e as any)}
                      className="contact-cb"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>

                  {visibleCols.map(col => (
                    <td
                      key={col.id}
                      style={{
                        padding: '9px 12px',
                        color: '#1e293b',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {renderCell(contact, col.id)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Modal pour ajouter à une liste / créer une liste ─── */}
      {isListModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Ajouter {selectedCount} contact(s) à une liste
              </h3>
              <button
                onClick={() => setIsListModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleListSubmit} style={{ padding: '1.5rem' }}>
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '3px',
                marginBottom: '1.5rem',
              }}>
                <button
                  type="button"
                  onClick={() => setListMode('existing')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: listMode === 'existing' ? 'white' : 'transparent',
                    boxShadow: listMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: listMode === 'existing' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Liste existante
                </button>
                <button
                  type="button"
                  onClick={() => setListMode('new')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: listMode === 'new' ? 'white' : 'transparent',
                    boxShadow: listMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: listMode === 'new' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Créer une liste
                </button>
              </div>

              {listMode === 'existing' ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="listSelect" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                    Sélectionner la liste
                  </label>
                  {existingLists.length === 0 ? (
                    <div style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: '#64748b',
                    }}>
                      Aucune liste existante. Veuillez en créer une.
                    </div>
                  ) : (
                    <select
                      id="listSelect"
                      value={selectedListId}
                      onChange={e => setSelectedListId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a',
                        background: 'white',
                      }}
                    >
                      {existingLists.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l._count?.contacts || 0} contacts)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="listName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Nom de la liste <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="listName"
                      value={newListName}
                      onChange={e => setNewListName(e.target.value)}
                      placeholder="ex: Donateurs 2026, Bénéficiaires Nord..."
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="listDesc" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Description (optionnelle)
                    </label>
                    <textarea
                      id="listDesc"
                      value={newListDescription}
                      onChange={e => setNewListDescription(e.target.value)}
                      placeholder="Description de la liste..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem',
                marginTop: '1.5rem',
              }}>
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  disabled={isSubmittingList}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingList || (listMode === 'existing' && existingLists.length === 0)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary, #3b82f6)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmittingList ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> En cours...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CSS ─── */}
      {/* ─── CSS ─── */}
      <style>{`
        .contact-cb {
          appearance: none;
          -webkit-appearance: none;
          width: 17px;
          height: 17px;
          border: 2px solid #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          vertical-align: middle;
          transition: all 0.15s;
          background: white;
          flex-shrink: 0;
        }
        .contact-cb:hover { border-color: var(--primary, #3b82f6); }
        .contact-cb:checked {
          border-color: var(--primary, #3b82f6);
          background: var(--primary, #3b82f6);
        }
        .contact-cb:checked::after {
          content: '';
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 4px;
          height: 8px;
          border-right: 2px solid white;
          border-bottom: 2px solid white;
        }
        .contact-cb:indeterminate {
          border-color: var(--primary, #3b82f6);
          background: white; /* Changed from primary to white to distinguish from checked */
        }
        .contact-cb:indeterminate::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 2px;
          background: var(--primary, #3b82f6); /* Changed from white to primary */
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
