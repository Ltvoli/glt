'use client'

import React, { useState, useTransition } from 'react'
import { toggleModuleAction, updatePageAction, reorderPagesAction, saveSystemSettingsAction, updateModuleAction, createPageAction, deletePageAction } from './actions'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check, X, GripVertical, Eye, EyeOff, Settings2, ToggleLeft,
  Compass, Save, Loader2, Mail, Clock, FileText,
  ChevronDown, ChevronRight, Lock, Users, CheckSquare,
  MapPin, CalendarDays, HelpCircle, Folder, ShieldAlert, Bell,
  Edit2, Trash2, Plus, Palette, Type, AlignLeft, Sparkles
} from 'lucide-react'

// ─── Meta données modules ────────────────────────────────────
const MODULE_META: Record<string, {
  name: string
  description: string
  icon: any
  color: string
  bg: string
  pages_help: string
}> = {
  contacts:    { name: 'Contacts citoyens',    icon: Users,        color: '#2563eb', bg: '#eff6ff', description: 'Base de données des citoyens, filtres, export CSV/Excel',        pages_help: 'La page Contacts est le répertoire principal des citoyens.' },
  tasks:       { name: 'Tâches',               icon: CheckSquare,  color: '#d97706', bg: '#fffbeb', description: 'Suivi des actions et demandes à traiter par l\'équipe',           pages_help: 'La page Tâches permet de suivre les demandes citoyens.' },
  mailcases:   { name: 'Courriers',            icon: Mail,         color: '#16a34a', bg: '#f0fdf4', description: 'Traitement des courriers entrants et sortants',                    pages_help: 'La page Courriers gère les dossiers de correspondance.' },
  questions:   { name: 'Questions écrites',   icon: HelpCircle,   color: '#9333ea', bg: '#f5f3ff', description: 'Suivi des QE déposées à l\'Assemblée Nationale',                 pages_help: 'La page Questions (QE) suit les questions parlementaires.' },
  agenda:      { name: 'Planning & Agenda',   icon: CalendarDays, color: '#0891b2', bg: '#ecfeff', description: 'Calendrier des événements et rendez-vous du bureau',              pages_help: 'La page Planning affiche le calendrier du bureau.' },
  reports:     { name: 'Rapports',             icon: FileText,     color: '#dc2626', bg: '#fef2f2', description: 'Rapports d\'activité hebdomadaires et statistiques',              pages_help: 'La page Rapports génère les bilans d\'activité.' },
  permanences: { name: 'Permanences mobiles', icon: MapPin,       color: '#059669', bg: '#ecfdf5', description: 'Organisation et suivi des permanences de terrain',                pages_help: 'La page Permanences organise les sorties de terrain du député.' },
}

const PERMISSION_LABELS: Record<string, string> = {
  'contacts.read':        '📋 Voir les contacts',
  'tasks.read':           '📋 Voir les tâches',
  'mailcases.read':       '📋 Voir les courriers',
  'questions.read':       '📋 Voir les questions',
  'agenda.read':          '📋 Voir le planning',
  'reports.read':         '📋 Voir les rapports',
  'permanences.read':     '📋 Voir les permanences',
}

// ─── Types ────────────────────────────────────────────────────
type Module  = { id: string; key: string; label: string; description: string | null; color: string | null; bg: string | null; isActive: boolean; showInSidebar: boolean }
type Page    = { id: string; slug: string; label: string; icon: string | null; moduleId: string; permission: string | null; order: number; isVisible: boolean }
type Setting = { key: string; value: string; type: string; category: string; label: string }

type ModulesClientProps = {
  currentUserRole: string
  modules: Module[]
  pages: Page[]
  settings: Setting[]
  permissions: { key: string }[]
}

// ─── Sous-composant SortablePage ─────────────────────────────
function SortablePageItem({ page, onEdit }: { page: Page; onEdit: (p: Page) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform), transition,
      opacity: isDragging ? 0.5 : 1,
      display: 'flex', alignItems: 'center',
      padding: '0.6rem 0.85rem', background: 'white',
      border: '1px solid #e2e8f0', borderRadius: '8px',
      marginBottom: '0.5rem', gap: '0.75rem',
      boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
        <GripVertical size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{page.label}</span>
        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#94a3b8', marginLeft: '8px' }}>{page.slug}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {page.permission && (
          <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: 600 }}>
            {PERMISSION_LABELS[page.permission] || page.permission}
          </span>
        )}
        <span title={page.isVisible ? 'Visible dans le menu' : 'Masquée du menu'}>
          {page.isVisible ? <Eye size={14} style={{ color: '#16a34a' }} /> : <EyeOff size={14} style={{ color: '#dc2626' }} />}
        </span>
        <button type="button" className="button outline" style={{ padding: '0.2rem 0.6rem', height: '26px', fontSize: '0.78rem' }}
          onClick={() => onEdit(page)}>
          Modifier
        </button>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function ModulesClient({ currentUserRole, modules: initialModules, pages: initialPages, settings: initialSettings, permissions }: ModulesClientProps) {
  const [activeTab, setActiveTab]     = useState<'modules' | 'pages' | 'settings'>('modules')
  const [modules, setModules]         = useState<Module[]>(initialModules)
  const [pages, setPages]             = useState<Page[]>(initialPages)
  const [settings, setSettings]       = useState<Setting[]>(initialSettings)
  const [settingsCategory, setSettingsCategory] = useState<'general' | 'auth' | 'email' | 'rgpd' | 'ai'>('general')

  // Edition page
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [creatingPageForModule, setCreatingPageForModule] = useState<string | null>(null)
  const [editLabel, setEditLabel]     = useState('')
  const [editSlug, setEditSlug]       = useState('')
  const [editPermission, setEditPermission] = useState('')
  const [editIsVisible, setEditIsVisible]   = useState(true)

  // Edition module
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [editModLabel, setEditModLabel] = useState('')
  const [editModDesc, setEditModDesc] = useState('')
  const [editModColor, setEditModColor] = useState('')
  const [editModBg, setEditModBg] = useState('')

  // Module accordéon état ouvert
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null)

  const [isPending, startTransition]         = useTransition()
  const [settingsPending, startSettingsTransition] = useTransition()
  const [successBanner, setSuccessBanner]    = useState('')
  const [errorBanner, setErrorBanner]        = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Actions ─────────────────────────────────────────────
  const handleToggleModule = async (moduleId: string, field: 'isActive' | 'showInSidebar', currentValue: boolean) => {
    setErrorBanner(''); setSuccessBanner('')
    const newValue = !currentValue
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, [field]: newValue } : m))
    const res = await toggleModuleAction(moduleId, field, newValue)
    if (res.success) setSuccessBanner('Configuration enregistrée.')
    else { setErrorBanner(res.error || 'Erreur'); setModules(prev => prev.map(m => m.id === moduleId ? { ...m, [field]: currentValue } : m)) }
  }

  const openEditPage = (page: Page) => {
    setEditingPage(page); setCreatingPageForModule(null); setEditLabel(page.label); setEditSlug(page.slug)
    setEditPermission(page.permission || ''); setEditIsVisible(page.isVisible)
  }

  const openCreatePage = (moduleId: string) => {
    setCreatingPageForModule(moduleId); setEditingPage(null)
    setEditLabel('Nouvelle Page'); setEditSlug('/nouvelle-page')
    setEditPermission(''); setEditIsVisible(true)
  }

  const openEditModule = (mod: Module) => {
    setEditingModule(mod)
    setEditModLabel(mod.label)
    setEditModDesc(mod.description || MODULE_META[mod.key]?.description || '')
    setEditModColor(mod.color || MODULE_META[mod.key]?.color || '#3b82f6')
    setEditModBg(mod.bg || MODULE_META[mod.key]?.bg || '#eff6ff')
  }

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingModule) return
    setErrorBanner(''); setSuccessBanner('')
    const data = { label: editModLabel, description: editModDesc, color: editModColor, bg: editModBg, icon: null }
    startTransition(async () => {
      const res = await updateModuleAction(editingModule.id, data)
      if (res.success) {
        setSuccessBanner('Module mis à jour.')
        setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, ...data } : m))
        setEditingModule(null)
      } else setErrorBanner(res.error || 'Erreur')
    })
  }

  const handleDeletePage = async () => {
    if (!editingPage) return
    if (!window.confirm('Voulez-vous vraiment supprimer cette page ? Cette action est irréversible.')) return
    setErrorBanner(''); setSuccessBanner('')
    startTransition(async () => {
      const res = await deletePageAction(editingPage.id)
      if (res.success) {
        setSuccessBanner('Page supprimée.')
        setPages(prev => prev.filter(p => p.id !== editingPage.id))
        setEditingPage(null)
      } else setErrorBanner(res.error || 'Erreur de suppression')
    })
  }

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPage && !creatingPageForModule) return
    setErrorBanner(''); setSuccessBanner('')

    if (creatingPageForModule) {
      const data = { label: editLabel, slug: editSlug, isVisible: editIsVisible, permission: editPermission || null, moduleId: creatingPageForModule, icon: null }
      startTransition(async () => {
        const res = await createPageAction(data)
        if (res.success) {
          setSuccessBanner('Page créée avec succès.')
          window.location.reload()
        } else setErrorBanner(res.error || 'Erreur lors de la création')
      })
      return
    }

    const updatedData = { label: editLabel, slug: editSlug, isVisible: editIsVisible, permission: editPermission || null }
    startTransition(async () => {
      const res = await updatePageAction(editingPage!.id, updatedData)
      if (res.success) {
        setSuccessBanner('Page mise à jour avec succès.')
        setPages(prev => prev.map(p => p.id === editingPage!.id ? { ...p, ...updatedData } : p))
        setEditingPage(null)
      } else setErrorBanner(res.error || 'Erreur lors de la sauvegarde')
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p.id === active.id)
      const newIndex = pages.findIndex(p => p.id === over.id)
      const reordered = arrayMove(pages, oldIndex, newIndex)
      setPages(reordered)
      startTransition(async () => {
        const res = await reorderPagesAction(reordered.map(p => p.id))
        if (res.success) setSuccessBanner('Ordre sauvegardé.')
        else { setErrorBanner(res.error || 'Erreur'); setPages(pages) }
      })
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(''); setSuccessBanner('')
    if (currentUserRole !== 'ADMINISTRATEUR') { setErrorBanner('Seul un Administrateur peut modifier les paramètres système.'); return }
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const settingsMap: Record<string, string> = {}
    settings.filter(s => s.category === settingsCategory).forEach(s => {
      const val = formData.get(s.key) as string
      if (val !== undefined) settingsMap[s.key] = val
    })
    startSettingsTransition(async () => {
      const res = await saveSystemSettingsAction(settingsCategory, settingsMap)
      if (res.success) {
        setSuccessBanner('Paramètres système enregistrés.')
        setSettings(prev => prev.map(s => s.category === settingsCategory && settingsMap[s.key] !== undefined && settingsMap[s.key] !== '••••••••••••' ? { ...s, value: settingsMap[s.key] } : s))
      } else setErrorBanner(res.error || 'Erreur lors de la sauvegarde')
    })
  }

  // Grouper pages par moduleId
  const pagesByModule = pages.reduce((acc, page) => {
    if (!acc[page.moduleId]) acc[page.moduleId] = []
    acc[page.moduleId].push(page)
    return acc
  }, {} as Record<string, Page[]>)

  const tabStyle = (tab: string): React.CSSProperties => ({
    background: 'none', border: 'none', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600,
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
    marginBottom: '-0.6rem', fontSize: '0.875rem', transition: 'all 0.15s',
  })

  const SETTINGS_CATEGORIES = [
    { key: 'general', label: 'Application générale', icon: Settings2, description: 'Nom, langue, apparence' },
    { key: 'auth',    label: 'Sécurité & Sessions', icon: Lock,      description: 'Durée de session, tentatives' },
    { key: 'email',   label: 'Envoi d\'e-mails',    icon: Mail,      description: 'Serveur SMTP sortant' },
    { key: 'rgpd',    label: 'Conformité RGPD',     icon: FileText,  description: 'Rétention et suppression données' },
    { key: 'ai',      label: 'Intelligence Artificielle', icon: Sparkles,  description: 'Assistant IA, analyse automatique' },
  ] as const

  return (
    <div>
      {successBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1rem', background: '#f0fdf4', color: '#15803d', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #bbf7d0', fontWeight: 500, fontSize: '0.9rem' }}>
          <Check size={16} /> {successBanner}
          <button onClick={() => setSuccessBanner('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}
      {errorBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #fecaca', fontWeight: 500, fontSize: '0.9rem' }}>
          <X size={16} /> {errorBanner}
          <button onClick={() => setErrorBanner('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.75rem' }}>
        <button style={tabStyle('modules')}  onClick={() => setActiveTab('modules')}>⚙️ Activation des modules</button>
        <button style={tabStyle('pages')}    onClick={() => setActiveTab('pages')}>🗂️ Pages & Navigation</button>
        <button style={tabStyle('settings')} onClick={() => setActiveTab('settings')}>🛠️ Paramètres système</button>
      </div>

      {/* ═══════ MODULES ══════════════════════════════════════ */}
      {activeTab === 'modules' && (
        <div>
          <div style={{ marginBottom: '1rem', padding: '0.85rem 1.1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.83rem', color: '#64748b' }}>
            💡 <strong>Activer / Désactiver</strong> un module masque toutes ses pages et fonctionnalités pour les collaborateurs. Les données existantes sont <strong>conservées</strong>.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {modules.map(mod => {
              const meta = MODULE_META[mod.key]
              const Icon = meta?.icon || Settings2

              return (
                <div key={mod.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem', border: '1px solid',
                  borderColor: mod.isActive ? (meta?.color + '40' || '#e2e8f0') : '#e2e8f0',
                  borderRadius: '12px', background: mod.isActive ? (meta?.bg || 'white') : '#f8fafc',
                  transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: mod.isActive ? (meta?.color || '#3b82f6') : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={20} color="white" />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: mod.isActive ? '#0f172a' : '#94a3b8' }}>
                      {mod.label || meta?.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      {mod.description || meta?.description || `Module ${mod.key}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                    <button type="button" onClick={() => openEditModule(mod)} className="button outline" style={{ padding: '0.4rem', height: '32px' }} title="Modifier les détails du module">
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                      <input type="checkbox" checked={mod.isActive}
                        onChange={() => handleToggleModule(mod.id, 'isActive', mod.isActive)} />
                      <span style={{ color: mod.isActive ? '#15803d' : '#94a3b8' }}>
                        {mod.isActive ? '✅ Module activé' : '⭕ Module désactivé'}
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: mod.isActive ? 'pointer' : 'not-allowed', fontSize: '0.82rem', color: mod.isActive ? '#64748b' : '#cbd5e1' }}>
                      <input type="checkbox" checked={mod.showInSidebar} disabled={!mod.isActive}
                        onChange={() => handleToggleModule(mod.id, 'showInSidebar', mod.showInSidebar)} />
                      Afficher dans le menu latéral
                    </label>
                  </div>
                </div>
              )
            })}
          </div>

          {editingModule && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="card" style={{ width: '400px', padding: '1.5rem', position: 'relative' }}>
                <button onClick={() => setEditingModule(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={20} />
                </button>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem' }}>Modifier le module</h3>
                <form onSubmit={handleSaveModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nom du module</label>
                    <input type="text" className="form-control" required value={editModLabel} onChange={e => setEditModLabel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description</label>
                    <textarea className="form-control" rows={3} value={editModDesc} onChange={e => setEditModDesc(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Couleur (ex: #3b82f6)</label>
                    <input type="text" className="form-control" value={editModColor} onChange={e => setEditModColor(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Couleur de fond (ex: #eff6ff)</label>
                    <input type="text" className="form-control" value={editModBg} onChange={e => setEditModBg(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="button" className="button outline" style={{ flex: 1 }} onClick={() => setEditingModule(null)}>Annuler</button>
                    <button type="submit" disabled={isPending} className="button" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      {isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PAGES & NAVIGATION ═══════════════════════════ */}
      {activeTab === 'pages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '2rem', alignItems: 'start' }}>

          {/* Gauche : modules accordéon */}
          <div>
            <div style={{ marginBottom: '1rem', padding: '0.85rem 1.1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.83rem', color: '#64748b' }}>
              🗂️ <strong>Cliquez sur un module</strong> pour voir et administrer ses pages. Glissez-déposez pour réorganiser l'ordre dans le menu.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modules.map(mod => {
                const meta   = MODULE_META[mod.key]
                const Icon   = meta?.icon || Settings2
                const modPages = pagesByModule[mod.id] || []
                const isOpen = expandedModuleKey === mod.key

                return (
                  <div key={mod.id} style={{ border: '1px solid', borderColor: isOpen ? (meta?.color + '50' || '#e2e8f0') : '#e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>

                    {/* ── En-tête cliquable ── */}
                    <button
                      onClick={() => setExpandedModuleKey(isOpen ? null : mod.key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
                        padding: '0.9rem 1.1rem', background: isOpen ? (meta?.bg || '#f8fafc') : 'white',
                        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: mod.isActive ? (meta?.color || '#3b82f6') : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {mod.label || meta?.name}
                          <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '999px', background: mod.isActive ? '#f0fdf4' : '#f1f5f9', color: mod.isActive ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                            {mod.isActive ? 'Actif' : 'Désactivé'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          {modPages.length} page{modPages.length > 1 ? 's' : ''} configurée{modPages.length > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {/* ── Contenu accordéon ── */}
                    {isOpen && (
                      <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #f1f5f9', background: 'white' }}>
                        {meta?.pages_help && (
                          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.75rem 0 0.75rem', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            💡 {meta.pages_help}
                          </p>
                        )}

                        {modPages.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', padding: '1.5rem 0' }}>
                            Aucune page configurée pour ce module.
                          </p>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={modPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                              <div style={{ marginTop: '0.75rem' }}>
                                {modPages.map(page => (
                                  <SortablePageItem key={page.id} page={page} onEdit={openEditPage} />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                        <button type="button" onClick={() => openCreatePage(mod.id)} className="button outline" style={{ marginTop: '0.75rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <Plus size={16} /> Créer une nouvelle page
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Droite : panneau d'édition de page */}
          {(editingPage || creatingPageForModule) ? (
            <div className="card" style={{ padding: '1.5rem', border: '1.5px solid var(--primary)', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    {editingPage ? 'Modifier la page' : 'Créer une page'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{editSlug}</p>
                </div>
                <button onClick={() => { setEditingPage(null); setCreatingPageForModule(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Nom affiché dans le menu
                  </label>
                  <input type="text" className="form-control" required value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '4px 0 0' }}>C'est le texte qui apparaît dans la barre latérale de navigation.</p>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Adresse URL de la page
                  </label>
                  <input type="text" className="form-control" required value={editSlug} onChange={e => setEditSlug(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '4px 0 0' }}>Ex : <code>/contacts</code>. Ne modifiez que si vous savez ce que vous faites.</p>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>
                    Droit d'accès requis
                  </label>
                  <select className="form-control" value={editPermission} onChange={e => setEditPermission(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">🔓 Accès libre (tous les membres connectés)</option>
                    {permissions.map(p => (
                      <option key={p.key} value={p.key}>{PERMISSION_LABELS[p.key] || p.key}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '4px 0 0' }}>Définit quel rôle minimum est nécessaire pour accéder à cette page.</p>
                </div>

                <div className="form-group" style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editIsVisible} onChange={e => setEditIsVisible(e.target.checked)} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>
                      {editIsVisible ? '👁 Visible dans le menu' : '🙈 Masquée du menu'}
                    </span>
                  </label>
                  <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: '6px 0 0 1.4rem', lineHeight: 1.4 }}>
                    Si masquée, la page reste accessible via son URL mais n'apparaît pas dans la sidebar de navigation.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="button outline" style={{ flex: 1, height: '38px' }} onClick={() => { setEditingPage(null); setCreatingPageForModule(null); }}>
                    Annuler
                  </button>
                  <button type="submit" disabled={isPending} className="button" style={{ flex: 1, height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    {isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                    Enregistrer
                  </button>
                </div>
                {editingPage && (
                  <button type="button" onClick={handleDeletePage} disabled={isPending} style={{ width: '100%', marginTop: '0.75rem', background: 'none', border: '1px solid #fecaca', color: '#dc2626', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Trash2 size={15} /> Supprimer la page
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', borderStyle: 'dashed', position: 'sticky', top: '1rem' }}>
              <Compass size={36} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, margin: '0 0 0.5rem', color: '#64748b' }}>Aucune page sélectionnée</p>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>
                Cliquez sur un module pour le développer, puis sur <strong>Modifier</strong> pour configurer une page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PARAMÈTRES SYSTÈME ════════════════════════════ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* Menu catégories */}
          <div className="card" style={{ padding: '0.5rem' }}>
            {SETTINGS_CATEGORIES.map(cat => {
              const Icon = cat.icon
              const isActive = settingsCategory === cat.key
              return (
                <button key={cat.key} onClick={() => setSettingsCategory(cat.key as any)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  width: '100%', padding: '0.7rem 0.85rem', border: 'none', borderRadius: '8px',
                  textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '2px',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}>
                  <Icon size={16} />
                  <div>
                    <div>{cat.label}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginTop: '1px' }}>{cat.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Formulaire catégorie */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              {SETTINGS_CATEGORIES.find(c => c.key === settingsCategory)?.label}
            </h3>
            <p style={{ color: '#64748b', margin: '0 0 1.5rem', fontSize: '0.82rem' }}>
              {SETTINGS_CATEGORIES.find(c => c.key === settingsCategory)?.description}
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {settings.filter(s => s.category === settingsCategory).map(s => {
                const isSecret = s.type === 'SECRET'
                return (
                  <div key={s.key} className="form-group">
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '5px', color: '#1e293b' }}>
                      {s.label}
                    </label>
                    <input
                      type={isSecret ? 'password' : 'text'} name={s.key} className="form-control"
                      defaultValue={isSecret ? '••••••••••••' : s.value}
                      placeholder={isSecret ? 'Saisir un secret…' : ''}
                      style={{ fontFamily: isSecret || s.type === 'NUMBER' ? 'monospace' : 'inherit', fontSize: '0.9rem' }}
                      onFocus={e => { if (isSecret && e.target.value === '••••••••••••') e.target.value = '' }}
                      onBlur={e  => { if (isSecret && e.target.value === '') e.target.value = '••••••••••••' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                      Clé interne : <code>{s.key}</code>
                    </span>
                  </div>
                )
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={settingsPending || currentUserRole !== 'ADMINISTRATEUR'} className="button"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: currentUserRole !== 'ADMINISTRATEUR' ? 0.5 : 1 }}>
                  {settingsPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                  Enregistrer
                </button>
              </div>
              {currentUserRole !== 'ADMINISTRATEUR' && (
                <p style={{ fontSize: '0.75rem', color: '#dc2626', textAlign: 'right', margin: '-0.5rem 0 0' }}>
                  🔒 Seul l'Administrateur peut modifier ces paramètres.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
