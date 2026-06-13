'use client'

import React, { useState, useTransition } from 'react'
import {
  inviteUserAction,
  resendInvitationAction,
  cancelInvitationAction,
  updateUserRoleAction,
  toggleUserSuspensionAction,
  revokeUserAction,
  saveRolePermissionsAction
} from './actions'
import {
  UserPlus, Search, ShieldCheck, UserMinus, UserCheck,
  RefreshCw, Trash2, Lock, Check, X, Mail, ShieldAlert,
  Loader2, Info, HelpCircle
} from 'lucide-react'

// ─── Traductions françaises des permissions ─────────────────
const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  // Contacts
  'contacts.read':   { label: '📋 Voir les contacts',     description: 'Consulter la liste et les fiches des citoyens' },
  'contacts.create': { label: '➕ Créer un contact',       description: 'Ajouter un nouveau citoyen dans la base' },
  'contacts.update': { label: '✏️ Modifier un contact',    description: 'Éditer les informations d\'un citoyen existant' },
  'contacts.delete': { label: '🗑️ Supprimer un contact',  description: 'Archiver ou supprimer définitivement un contact' },
  // Tâches
  'tasks.read':      { label: '📋 Voir les tâches',        description: 'Consulter la liste des tâches et leur statut' },
  'tasks.create':    { label: '➕ Créer une tâche',         description: 'Créer et assigner une nouvelle tâche' },
  'tasks.update':    { label: '✏️ Modifier une tâche',     description: 'Changer le statut, titre ou responsable d\'une tâche' },
  'tasks.delete':    { label: '🗑️ Supprimer une tâche',   description: 'Clôturer ou supprimer définitivement une tâche' },
  // Courriers
  'mailcases.read':   { label: '📋 Voir les courriers',     description: 'Consulter les dossiers de courriers entrants et sortants' },
  'mailcases.create': { label: '➕ Créer un courrier',       description: 'Enregistrer un nouveau dossier de courrier' },
  'mailcases.update': { label: '✏️ Modifier un courrier',   description: 'Mettre à jour un dossier (statut, réponse, etc.)' },
  'mailcases.delete': { label: '🗑️ Supprimer un courrier', description: 'Archiver ou clôturer un dossier de courrier' },
  // Questions écrites
  'questions.read':   { label: '📋 Voir les questions (QE)',    description: 'Consulter les questions écrites au gouvernement' },
  'questions.create': { label: '➕ Créer une question (QE)',     description: 'Enregistrer une nouvelle question écrite' },
  'questions.update': { label: '✏️ Modifier une question (QE)', description: 'Mettre à jour le suivi d\'une question' },
  'questions.delete': { label: '🗑️ Supprimer une question',    description: 'Retirer une question du suivi' },
  // Planning
  'agenda.read':      { label: '📋 Voir le planning',      description: 'Consulter le calendrier des événements et réunions' },
  'agenda.create':    { label: '➕ Créer un événement',     description: 'Ajouter un rendez-vous ou une réunion au calendrier' },
  'agenda.update':    { label: '✏️ Modifier un événement', description: 'Modifier les détails d\'un événement existant' },
  'agenda.delete':    { label: '🗑️ Supprimer un événement', description: 'Retirer un événement du calendrier' },
  // Rapports
  'reports.read':     { label: '📋 Voir les rapports',     description: 'Consulter les rapports hebdomadaires et statistiques' },
  'reports.create':   { label: '➕ Créer un rapport',       description: 'Générer un nouveau rapport d\'activité' },
  'reports.update':   { label: '✏️ Modifier un rapport',   description: 'Corriger ou compléter un rapport existant' },
  'reports.delete':   { label: '🗑️ Supprimer un rapport',  description: 'Retirer un rapport de l\'historique' },
  // Permanences
  'permanences.read':     { label: '📋 Voir les permanences',      description: 'Consulter le planning des permanences mobiles' },
  'permanences.create':   { label: '➕ Créer une permanence',       description: 'Planifier une nouvelle permanence de terrain' },
  'permanences.update':   { label: '✏️ Modifier une permanence',   description: 'Mettre à jour les détails d\'une permanence' },
  'permanences.delete':   { label: '🗑️ Supprimer une permanence', description: 'Annuler ou supprimer une permanence' },
  'permanences.validate': { label: '✅ Valider une permanence',     description: 'Approuver et finaliser un dossier de permanence' },
  'permanences.export':   { label: '📤 Exporter une permanence',   description: 'Télécharger le dossier en PDF ou Excel' },
  // Admin
  'users.manage':    { label: '👥 Gérer les membres',       description: 'Inviter, suspendre ou révoquer des collaborateurs' },
  'roles.manage':    { label: '🔐 Gérer les rôles',         description: 'Modifier la matrice des permissions par rôle' },
  'modules.manage':  { label: '⚙️ Gérer les modules',       description: 'Activer ou désactiver les fonctionnalités du bureau' },
  'pages.manage':    { label: '🗂️ Gérer les pages',         description: 'Configurer la navigation et les accès aux pages' },
  'settings.manage': { label: '🛠️ Paramètres système',     description: 'Configurer les paramètres globaux de l\'application' },
  'audit.read':      { label: '🔍 Journal d\'audit',        description: 'Consulter l\'historique complet des actions réalisées' },
}

const MODULE_LABELS: Record<string, { name: string; description: string; emoji: string }> = {
  contacts:    { name: 'Contacts citoyens',    description: 'Gestion de la base de données des citoyens',        emoji: '👥' },
  tasks:       { name: 'Tâches',               description: 'Suivi des actions et demandes à traiter',           emoji: '✅' },
  mailcases:   { name: 'Courriers',            description: 'Traitement des courriers entrants et sortants',      emoji: '📬' },
  questions:   { name: 'Questions écrites',   description: 'Suivi des QE déposées à l\'Assemblée Nationale',    emoji: '📝' },
  agenda:      { name: 'Planning',             description: 'Agenda et calendrier des événements',               emoji: '📅' },
  reports:     { name: 'Rapports',             description: 'Rapports d\'activité hebdomadaires et statistiques', emoji: '📊' },
  permanences: { name: 'Permanences mobiles', description: 'Organisation des permanences de terrain',           emoji: '📍' },
  admin:       { name: 'Administration',       description: 'Gestion avancée du bureau (réservé admin)',         emoji: '🔐' },
}

const ROLE_LABELS: Record<string, { name: string; description: string; color: string; bg: string }> = {
  ADMINISTRATEUR: { name: 'Administrateur', description: 'Accès total — gère le bureau et les membres',   color: '#dc2626', bg: '#fef2f2' },
  SUPERVISEUR:    { name: 'Superviseur',    description: 'Gère les dossiers — ne peut pas modifier admin', color: '#9333ea', bg: '#f5f3ff' },
  COORDINATEUR:   { name: 'Coordinateur',  description: 'Crée et modifie — ne peut pas supprimer',       color: '#2563eb', bg: '#eff6ff' },
  USER:           { name: 'Collaborateur', description: 'Lecture seule — consulte sans modifier',          color: '#16a34a', bg: '#f0fdf4' },
}

// ─── Types ────────────────────────────────────────────────────
type User = { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; suspendedAt: Date | null; lastLoginAt: Date | null; lastLoginIp: string | null }
type Invitation = { id: string; email: string; role: string; expiresAt: Date; createdAt: Date }
type Permission = { id: string; key: string; label: string; module: string }
type RolePermission = { role: string; permissionId: string }
type MembersClientProps = { currentUserId: string; currentUserRole: string; users: User[]; invitations: Invitation[]; permissions: Permission[]; rolePermissions: RolePermission[] }

// ─── Tooltip simple ──────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: '4px' }}
      onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <HelpCircle size={13} style={{ color: '#94a3b8', cursor: 'help' }} />
      {visible && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white', borderRadius: '6px',
          padding: '6px 10px', fontSize: '0.75rem', lineHeight: 1.4,
          whiteSpace: 'normal', maxWidth: '260px',
          width: '200px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────
export default function MembersClient({
  currentUserId,
  currentUserRole,
  users: initialUsers,
  invitations: initialInvitations,
  permissions,
  rolePermissions: initialRolePermissions
}: MembersClientProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members')
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(initialRolePermissions)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('USER')
  const [inviteLinkResult, setInviteLinkResult] = useState('')
  const [inviteError, setInviteError] = useState('')

  const [isPending, startTransition] = useTransition()
  const [matrixPending, startMatrixTransition] = useTransition()
  const [errorBanner, setErrorBanner] = useState('')
  const [successBanner, setSuccessBanner] = useState('')

  // Tooltip state for matrix header
  const [expandedModule, setExpandedModule] = useState<string | null>(null)

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole   = roleFilter   === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'ACTIVE'    && !user.suspendedAt)
      || (statusFilter === 'SUSPENDED' && user.suspendedAt)
    return matchesSearch && matchesRole && matchesStatus
  })

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = []
    acc[perm.module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // ── Actions ─────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(''); setInviteLinkResult(''); setErrorBanner(''); setSuccessBanner('')
    if (!inviteEmail) return
    const formData = new FormData()
    formData.append('email', inviteEmail)
    formData.append('role', inviteRole)
    startTransition(async () => {
      const res = await inviteUserAction(null, formData)
      if (res.success && res.data) {
        setInviteLinkResult(res.data.inviteLink)
        setInviteEmail('')
        setSuccessBanner('Invitation créée avec succès !')
        setInvitations(prev => [{ id: Math.random().toString(), email: inviteEmail, role: inviteRole, createdAt: new Date(), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) }, ...prev])
      } else { setInviteError(res.error || 'Erreur lors de l\'invitation') }
    })
  }

  const handleResendInvitation = async (invId: string) => {
    const res = await resendInvitationAction(invId)
    if (res.success && res.data) { setSuccessBanner('Invitation renvoyée !'); setInviteLinkResult(res.data.inviteLink) }
    else setErrorBanner(res.error || 'Erreur')
  }

  const handleCancelInvitation = async (invId: string) => {
    if (!confirm('Annuler cette invitation ?')) return
    const res = await cancelInvitationAction(invId)
    if (res.success) { setSuccessBanner('Invitation annulée.'); setInvitations(prev => prev.filter(inv => inv.id !== invId)) }
    else setErrorBanner(res.error || 'Erreur')
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const res = await updateUserRoleAction(userId, newRole as any)
    if (res.success) { setSuccessBanner('Rôle mis à jour.'); setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u)) }
    else setErrorBanner(res.error || 'Impossible de modifier le rôle')
  }

  const handleToggleSuspension = async (userId: string) => {
    const res = await toggleUserSuspensionAction(userId)
    if (res.success) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspendedAt: u.suspendedAt ? null : new Date() } : u)); setSuccessBanner('Statut modifié.') }
    else setErrorBanner(res.error || 'Action impossible')
  }

  const handleRevoke = async (userId: string) => {
    if (!confirm('Révoquer définitivement ce membre ? Son compte sera anonymisé (RGPD).')) return
    const res = await revokeUserAction(userId)
    if (res.success) { setSuccessBanner('Membre révoqué.'); setUsers(prev => prev.filter(u => u.id !== userId)) }
    else setErrorBanner(res.error || 'Action impossible')
  }

  const handleMatrixToggle = (role: string, permissionId: string, isChecked: boolean) => {
    setErrorBanner(''); setSuccessBanner('')
    if (currentUserRole !== 'ADMINISTRATEUR') { setErrorBanner('Seul un Administrateur peut modifier les permissions.'); return }

    const currentRolePerms = rolePermissions.filter(rp => rp.role === role)
    let newPermIds = currentRolePerms.map(rp => rp.permissionId)
    if (isChecked) { if (!newPermIds.includes(permissionId)) newPermIds.push(permissionId) }
    else { newPermIds = newPermIds.filter(id => id !== permissionId) }

    const previousRolePermissions = [...rolePermissions]
    setRolePermissions(prev => {
      const filtered = prev.filter(rp => rp.role !== role)
      const added = newPermIds.map(pId => ({ role, permissionId: pId }))
      return [...filtered, ...added]
    })

    startMatrixTransition(async () => {
      const res = await saveRolePermissionsAction(role as any, newPermIds)
      if (res.success) setSuccessBanner('Permissions mises à jour ✓')
      else { setErrorBanner(res.error || 'Erreur'); setRolePermissions(previousRolePermissions) }
    })
  }

  // ── Render ───────────────────────────────────────────────
  const tabStyle = (tab: string): React.CSSProperties => ({
    background: 'none', border: 'none', padding: '0.5rem 1.25rem',
    cursor: 'pointer', fontWeight: 600,
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
    marginBottom: '-0.6rem', fontSize: '0.875rem', transition: 'all 0.15s',
  })

  return (
    <div>
      {successBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: '#f0fdf4', color: '#15803d', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #bbf7d0', fontWeight: 500 }}>
          <Check size={17} /> {successBanner}
          <button onClick={() => setSuccessBanner('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#15803d' }}><X size={15} /></button>
        </div>
      )}
      {errorBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #fecaca', fontWeight: 500 }}>
          <ShieldAlert size={17} /> {errorBanner}
          <button onClick={() => setErrorBanner('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={15} /></button>
        </div>
      )}

      {/* ── Tabs ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.75rem' }}>
        <button style={tabStyle('members')} onClick={() => setActiveTab('members')}>👤 Membres du bureau</button>
        <button style={tabStyle('roles')}   onClick={() => setActiveTab('roles')}>🔐 Droits & Permissions</button>
      </div>

      {/* ═══════════════ MEMBRES ═══════════════════════════ */}
      {activeTab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>

          {/* Liste membres */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Membres actifs ({filteredUsers.length})
            </h3>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-control" style={{ paddingLeft: '2rem', height: '36px' }}
                  placeholder="Rechercher par nom, email…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select className="form-control" style={{ width: '160px', height: '36px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="ALL">Tous les rôles</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
                <option value="SUPERVISEUR">Superviseur</option>
                <option value="COORDINATEUR">Coordinateur</option>
                <option value="USER">Collaborateur</option>
              </select>
              <select className="form-control" style={{ width: '130px', height: '36px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">Tous statuts</option>
                <option value="ACTIVE">Actifs</option>
                <option value="SUSPENDED">Suspendus</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Dernière connexion</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Aucun membre trouvé</td></tr>
                  ) : filteredUsers.map(user => {
                    const isSelf             = user.id === currentUserId
                    const isTargetAdmin      = user.role === 'ADMINISTRATEUR'
                    const isSupervisor       = currentUserRole === 'SUPERVISEUR'
                    const disableActions     = isSelf || (isSupervisor && isTargetAdmin)
                    const roleInfo           = ROLE_LABELS[user.role]

                    return (
                      <tr key={user.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                            {user.firstName} {user.lastName} {isSelf && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(vous)</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </td>
                        <td>
                          {disableActions ? (
                            <span style={{ fontSize: '0.82rem', padding: '3px 8px', borderRadius: '999px', background: roleInfo?.bg, color: roleInfo?.color, fontWeight: 600 }}>
                              {roleInfo?.name || user.role}
                            </span>
                          ) : (
                            <select className="form-control" style={{ height: '30px', padding: '0 0.25rem', width: '155px', fontSize: '0.82rem' }}
                              value={user.role} onChange={e => handleUpdateRole(user.id, e.target.value)}>
                              <option value="USER">Collaborateur</option>
                              <option value="COORDINATEUR">Coordinateur</option>
                              <option value="SUPERVISEUR">Superviseur</option>
                              {!isSupervisor && <option value="ADMINISTRATEUR">Administrateur</option>}
                            </select>
                          )}
                        </td>
                        <td>
                          <span style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px',
                            background: user.suspendedAt ? '#fef2f2' : '#f0fdf4',
                            color:      user.suspendedAt ? '#dc2626' : '#16a34a' }}>
                            {user.suspendedAt ? 'Suspendu' : 'Actif'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {user.lastLoginAt
                            ? <div>{new Date(user.lastLoginAt).toLocaleDateString('fr-FR')}<br /><span style={{ fontSize: '0.72rem' }}>IP : {user.lastLoginIp || '-'}</span></div>
                            : 'Jamais connecté'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleToggleSuspension(user.id)} disabled={disableActions}
                              className="button outline" title={user.suspendedAt ? 'Réactiver le compte' : 'Suspendre temporairement'}
                              style={{ padding: '0.2rem 0.45rem', height: '28px', fontSize: '0.78rem', opacity: disableActions ? 0.4 : 1, cursor: disableActions ? 'not-allowed' : 'pointer' }}>
                              {user.suspendedAt ? <UserCheck size={14} /> : <UserMinus size={14} />}
                            </button>
                            <button onClick={() => handleRevoke(user.id)} disabled={disableActions}
                              className="button danger outline" title="Révoquer définitivement (RGPD)"
                              style={{ padding: '0.2rem 0.45rem', height: '28px', fontSize: '0.78rem', opacity: disableActions ? 0.4 : 1, cursor: disableActions ? 'not-allowed' : 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Panneau droit ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Inviter */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} style={{ color: 'var(--primary)' }} /> Inviter un collaborateur
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                Un lien d'invitation valable 48h sera généré.
              </p>

              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Adresse e-mail</label>
                  <input type="email" className="form-control" required placeholder="ex : sophie@bureau.fr"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Niveau d'accès</label>
                  <select className="form-control" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    <option value="USER">Collaborateur — lecture seule</option>
                    <option value="COORDINATEUR">Coordinateur — création & modification</option>
                    <option value="SUPERVISEUR">Superviseur — accès étendu</option>
                    {currentUserRole === 'ADMINISTRATEUR' && <option value="ADMINISTRATEUR">Administrateur — accès total</option>}
                  </select>
                  {ROLE_LABELS[inviteRole] && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0', paddingLeft: '4px' }}>
                      💡 {ROLE_LABELS[inviteRole].description}
                    </p>
                  )}
                </div>
                {inviteError && <div style={{ color: '#dc2626', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={13} />{inviteError}</div>}
                <button type="submit" disabled={isPending} className="button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '38px' }}>
                  {isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                  Générer le lien d'invitation
                </button>
              </form>

              {inviteLinkResult && (
                <div style={{ marginTop: '1rem', padding: '0.9rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', margin: '0 0 6px' }}>✅ Lien prêt (valide 48h) :</p>
                  <input type="text" readOnly className="form-control"
                    value={typeof window !== 'undefined' ? window.location.origin + inviteLinkResult : inviteLinkResult}
                    onClick={e => (e.target as HTMLInputElement).select()}
                    style={{ fontSize: '0.72rem', fontFamily: 'monospace', background: '#fff' }} />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Cliquez pour sélectionner, puis copiez (Ctrl+C)</p>
                </div>
              )}
            </div>

            {/* Invitations en attente */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
                Invitations en attente ({invitations.length})
              </h3>
              {invitations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>Aucune invitation active.</p>
              ) : invitations.map(inv => {
                const isExpired = new Date() > new Date(inv.expiresAt)
                const invRole = ROLE_LABELS[inv.role]
                return (
                  <div key={inv.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: isExpired ? '#fef2f2' : 'white', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-all' }}>{inv.email}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: '999px', background: invRole?.bg, color: invRole?.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {invRole?.name || inv.role}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: isExpired ? '#dc2626' : 'var(--text-muted)' }}>
                        {isExpired ? '⚠ Expirée' : `Expire le ${new Date(inv.expiresAt).toLocaleDateString('fr-FR')}`}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => handleResendInvitation(inv.id)} className="button outline" title="Renouveler (48h)"
                          style={{ padding: '0.2rem', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RefreshCw size={12} />
                        </button>
                        <button onClick={() => handleCancelInvitation(inv.id)} className="button danger outline" title="Annuler"
                          style={{ padding: '0.2rem', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MATRICE DROITS ═══════════════════════ */}
      {activeTab === 'roles' && (
        <div>
          {/* Légende des rôles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
            {Object.entries(ROLE_LABELS).map(([key, r]) => (
              <div key={key} style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: r.bg, border: `1px solid ${r.color}30` }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: r.color }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>{r.description}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
                  Matrice des droits d'accès
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>
                  {currentUserRole === 'ADMINISTRATEUR'
                    ? '✏️ Cochez ou décochez pour accorder ou retirer un droit. Les modifications sont sauvegardées instantanément.'
                    : '👁 Vue en lecture seule — seul l\'Administrateur peut modifier ces réglages.'}
                </p>
              </div>
              {matrixPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--primary)', background: '#eff6ff', padding: '6px 12px', borderRadius: '999px', fontWeight: 600 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…
                </div>
              )}
            </div>

            {/* Tableau par module — accordéon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                const modInfo = MODULE_LABELS[moduleName] || { name: moduleName, description: '', emoji: '⚙️' }
                const isExpanded = expandedModule === moduleName

                return (
                  <div key={moduleName} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

                    {/* ── Module header (cliquable) ── */}
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : moduleName)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.85rem 1.1rem', background: isExpanded ? '#f8fafc' : 'white',
                        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{modInfo.emoji}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{modInfo.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>({perms.length} droit{perms.length > 1 ? 's' : ''})</span>
                          {modInfo.description && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{modInfo.description}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Mini-résumé des rôles autorisés */}
                        <div style={{ display: 'flex', gap: '0.25rem', opacity: 0.6 }}>
                          {['ADMINISTRATEUR', 'SUPERVISEUR', 'COORDINATEUR', 'USER'].map(role => {
                            const hasAny = perms.some(p => rolePermissions.some(rp => rp.role === role && rp.permissionId === p.id))
                            const rInfo = ROLE_LABELS[role]
                            return (
                              <span key={role} title={rInfo.name} style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: hasAny ? rInfo.color : '#e2e8f0',
                              }} />
                            )
                          })}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{isExpanded ? '▲ Réduire' : '▼ Configurer'}</span>
                      </div>
                    </button>

                    {/* ── Permission rows (accordéon) ── */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        {/* En-tête des colonnes */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px 130px', gap: 0, background: '#f8fafc', padding: '0.5rem 1.1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <div>Droit d'accès</div>
                          {Object.values(ROLE_LABELS).map(r => (
                            <div key={r.name} style={{ textAlign: 'center', color: r.color }}>{r.name}</div>
                          ))}
                        </div>

                        {perms.map((perm, idx) => {
                          const translated = PERMISSION_LABELS[perm.key]
                          return (
                            <div
                              key={perm.id}
                              style={{
                                display: 'grid', gridTemplateColumns: '1fr 130px 130px 130px 130px',
                                alignItems: 'center',
                                padding: '0.7rem 1.1rem',
                                borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                                background: 'white',
                                transition: 'background 0.1s',
                              }}
                              onMouseOver={e => (e.currentTarget.style.background = '#fafbff')}
                              onMouseOut={e => (e.currentTarget.style.background = 'white')}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                                  {translated?.label || perm.key}
                                </div>
                                {translated?.description && (
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {translated.description}
                                  </div>
                                )}
                              </div>

                              {/* Administrateur — toujours coché */}
                              <div style={{ textAlign: 'center' }}>
                                <span title="L'administrateur a toujours tous les droits" style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: '24px', height: '24px', borderRadius: '6px',
                                  background: '#fef2f2', border: '1px solid #fecaca',
                                }}>
                                  <Lock size={13} color="#dc2626" />
                                </span>
                              </div>

                              {/* Autres rôles */}
                              {['SUPERVISEUR', 'COORDINATEUR', 'USER'].map(role => {
                                const isGranted  = rolePermissions.some(rp => rp.role === role && rp.permissionId === perm.id)
                                const isReadOnly = currentUserRole !== 'ADMINISTRATEUR'
                                const rInfo      = ROLE_LABELS[role]

                                return (
                                  <div key={role} style={{ textAlign: 'center' }}>
                                    {isReadOnly ? (
                                      <span title={isGranted ? 'Autorisé' : 'Non autorisé'} style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '24px', height: '24px', borderRadius: '6px',
                                        background: isGranted ? '#f0fdf4' : '#f8fafc',
                                        border: `1px solid ${isGranted ? '#bbf7d0' : '#e2e8f0'}`,
                                      }}>
                                        {isGranted
                                          ? <Check size={13} color="#16a34a" />
                                          : <X size={13} color="#cbd5e1" />}
                                      </span>
                                    ) : (
                                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} title={isGranted ? `Retirer à : ${rInfo.name}` : `Accorder à : ${rInfo.name}`}>
                                        <input
                                          type="checkbox" checked={isGranted} disabled={matrixPending}
                                          onChange={e => handleMatrixToggle(role, perm.id, e.target.checked)}
                                          style={{ display: 'none' }}
                                        />
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                          width: '24px', height: '24px', borderRadius: '6px', transition: 'all 0.15s',
                                          background: isGranted ? rInfo.bg : '#f8fafc',
                                          border: `2px solid ${isGranted ? rInfo.color : '#e2e8f0'}`,
                                          cursor: matrixPending ? 'not-allowed' : 'pointer',
                                        }}>
                                          {isGranted ? <Check size={13} color={rInfo.color} /> : null}
                                        </span>
                                      </label>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
