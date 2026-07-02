import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditContactForm from './edit-contact-form'
import ArchiveButton from './archive-button'
import { MapPin, Phone, Mail, Building, Clock, CheckSquare, Mail as MailIcon, HelpCircle, Smartphone, ExternalLink, User, Briefcase, Calendar, Globe, AlertTriangle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import { getModuleFields } from '@/lib/fields'
import ContactConsentsCard from './contact-consents-card'
import ContactInteractionsTimeline from './contact-interactions-timeline'

// ── Contraste auto pour les tags ────────────────────────────
function getContrastText(hexColor: string): string {
  const hex = (hexColor || '#6366f1').replace('#', '')
  if (hex.length < 6) return '#1e293b'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1e293b' : '#ffffff'
}

// ── Traduction des codes audit ───────────────────────────────
const AUDIT_LABELS: Record<string, string> = {
  CONTACT_CREATED:         '✅ Fiche créée',
  CONTACT_UPDATED:         '✏️ Fiche modifiée',
  CONTACT_ARCHIVED:        '📦 Contact archivé',
  CONTACT_RESTORED:        '♻️ Contact restauré',
  CONTACT_DELETED:         '🗑️ Contact supprimé',
  TAG_ADDED:               '🏷️ Tag ajouté',
  TAG_REMOVED:             '🏷️ Tag supprimé',
  SUPPORT_LEVEL_CHANGED:   '📊 Niveau de soutien modifié',
  TASK_LINKED:             '🔗 Tâche associée',
  MAIL_LINKED:             '🔗 Courrier associé',
  DUPLICATE_MERGED:        '🔀 Doublon fusionné',
  NOTE_ADDED:              '📝 Note ajoutée',
}

function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action.toLowerCase().replace(/_/g, ' ')
}

// ── Label type contact ───────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ELECTEUR:       { label: 'Électeur',   color: '#1d4ed8', bg: '#dbeafe' },
  ELU:            { label: 'Élu',        color: '#7c3aed', bg: '#ede9fe' },
  CONTACT_MAIRIE: { label: 'Contact Mairie', color: '#b45309', bg: '#fef3c7' },
  ASSO:           { label: 'Association',color: '#065f46', bg: '#d1fae5' },
  PARTENAIRE:     { label: 'Partenaire', color: '#92400e', bg: '#fef3c7' },
  PRESSE:         { label: 'Presse',     color: '#be185d', bg: '#fce7f3' },
  AUTRE:          { label: 'Autre',      color: '#374151', bg: '#f3f4f6' },
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id, archivedAt: null },
    include: {
      createdBy: true,
      updatedBy: true,
      tags: { include: { tag: true } },
      interactions: {
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' }
      }
    }
  })

  if (!contact) notFound()

  const [auditLogs, linkedTasks, linkedMails, linkedQEs, allTags, supportLevels, dictionary, fieldConfig] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: 'Contact', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { firstName: true, lastName: true } } }
    }),
    prisma.task.findMany({
      where: { links: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.mailCase.findMany({
      where: { 
        links: { some: { contactId: id } },
        OR: [
          { type: 'ENTRANT' },
          { type: 'SORTANT', validationStatus: 'VALIDE' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.writtenQuestion.findMany({
      where: { links: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.supportLevel.findMany({ orderBy: { order: 'asc' } }),
    prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
    getModuleFields('contacts')
  ])

  // Construire l'adresse complète pour Google Maps et l'affichage
  const addressParts = [
    contact.apartment,
    contact.building,
    contact.streetNumber ? `${contact.streetNumber} ${contact.streetName || ''}` : contact.streetName,
    contact.addressComplement,
    contact.postalCode ? `${contact.postalCode} ${contact.city || ''}` : contact.city
  ].filter(Boolean)
  
  const fullAddress = addressParts.join(', ')
  const mapsUrl = fullAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`
    : null

  // Badge niveau de soutien depuis BDD (avec fallback pour les chiffres 1-5)
  let supportLevelData = supportLevels.find(sl => sl.label === contact.supportLevel)
  if (!supportLevelData && contact.supportLevel) {
    const num = parseInt(contact.supportLevel)
    if (!isNaN(num) && num >= 1 && num <= 5 && supportLevels.length > 0) {
      const idx = Math.round(((num - 1) / 4) * (supportLevels.length - 1))
      supportLevelData = supportLevels[Math.min(idx, supportLevels.length - 1)]
    }
  }

  const typeData = TYPE_LABELS[contact.type] || TYPE_LABELS['AUTRE']

  // Initiales pour l'avatar
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div>
      {contact.isNpai && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderLeft: '4px solid #dc2626',
          borderRadius: '8px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#b91c1c'
        }} className="hide-on-print">
          <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Adresse NPAI (N&apos;habite pas à l&apos;adresse indiquée)</strong>
            <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>Les courriers postaux envoyés à ce contact sont retournés. Veuillez mettre à jour son adresse.</span>
          </div>
        </div>
      )}
      {/* ─── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }} className="hide-on-print">
        <Link href="/contacts" className="button outline">← Retour</Link>
        <PrintButton />

        {/* Avatar */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>
          {initials}
        </div>

        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
            {contact.firstName} {contact.lastName}
            {contact.usageName && (
              <span style={{ fontSize: '1.2rem', fontWeight: 500, color: '#64748b', marginLeft: '0.5rem' }}>
                ({contact.usageName})
              </span>
            )}
          </h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
              backgroundColor: typeData.bg, color: typeData.color,
            }}>
              {typeData.label}
            </span>
            {contact.gender && (
              <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                {contact.gender === 'H' ? '♂ Homme' : contact.gender === 'F' ? '♀ Femme' : contact.gender}
              </span>
            )}
            {supportLevelData && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                backgroundColor: supportLevelData.color + '22', color: supportLevelData.color,
                border: `1px solid ${supportLevelData.color}44`,
              }}>
                📊 {supportLevelData.label}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href={`/tasks/new?contactId=${contact.id}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={15} /> + Tâche
          </Link>
          <Link href={`/mails/new?contactId=${contact.id}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MailIcon size={15} /> + Courrier
          </Link>
          <ArchiveButton contactId={contact.id} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ═══ COLONNE GAUCHE ═══════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Carte coordonnées */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} style={{ color: 'var(--primary)' }} /> Coordonnées
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Téléphone fixe */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="contact-coord-link">
                    {contact.phone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Tél. fixe non renseigné</span>
                )}
              </div>

              {/* Mobile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Smartphone size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                {contact.mobilePhone ? (
                  <a href={`tel:${contact.mobilePhone}`} className="contact-coord-link">
                    {contact.mobilePhone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Mobile non renseigné</span>
                )}
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="contact-coord-link" style={{ wordBreak: 'break-all' }}>
                    {contact.email}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Email non renseigné</span>
                )}
              </div>

              {/* Adresse + lien Google Maps */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  {fullAddress ? (
                    <>
                      <div style={{ color: 'var(--foreground)', fontSize: '0.88rem', fontWeight: 500 }}>{fullAddress}</div>
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', marginTop: '4px' }}>
                          <ExternalLink size={11} /> Voir sur Google Maps
                        </a>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Adresse non renseignée</span>
                  )}
                </div>
              </div>



              {/* Profession */}
              {contact.profession && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Briefcase size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Profession : <strong>{contact.profession}</strong>
                  </span>
                </div>
              )}

              {/* Date de naissance */}
              {contact.birthDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Né(e) le : <strong>{new Date(contact.birthDate).toLocaleDateString('fr-FR')}</strong>
                  </span>
                </div>
              )}

              {/* Tranche d'âge */}
              {contact.ageRange && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Tranche d'âge : <strong>{contact.ageRange}</strong>
                  </span>
                </div>
              )}

              {/* Nationalité */}
              {contact.nationality && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Globe size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Nationalité : <strong>{contact.nationality}</strong>
                  </span>
                </div>
              )}

              {/* Territoire */}
              {contact.territory && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Building size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Territoire : <strong>{contact.territory}</strong>
                  </span>
                </div>
              )}

              {/* Département */}
              {contact.department && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Building size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Département : <strong>{contact.department}</strong>
                  </span>
                </div>
              )}

              {/* Dernier contact mobile */}
              {contact.lastContactMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Smartphone size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ color: 'var(--foreground)', fontSize: '0.88rem' }}>
                    Dernier contact mobile : <strong>{new Date(contact.lastContactMobile).toLocaleString('fr-FR')}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {contact.tags.map((ct: any) => {
                  const bg = ct.tag.color || '#6366f1'
                  return (
                    <span key={ct.tag.id} style={{
                      padding: '3px 9px', borderRadius: '999px', fontSize: '0.73rem',
                      fontWeight: 600, backgroundColor: bg, color: getContrastText(bg),
                      whiteSpace: 'nowrap',
                    }}>
                      {ct.tag.name}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Notes internes */}
            {contact.notes && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.35rem' }}>Notes internes</div>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  lineHeight: 1.5,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word'
                }}>
                  {contact.notes}
                </p>
              </div>
            )}

            {/* Créé par & Modifié par */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#94a3b8', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={13} />
                <span>
                  Créé le {contact.createdAt.toLocaleDateString('fr-FR')}
                  {contact.createdBy && ` par ${contact.createdBy.firstName} ${contact.createdBy.lastName}`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={13} />
                <span>
                  Mis à jour le {contact.updatedAt.toLocaleDateString('fr-FR')}
                  {contact.updatedBy && ` par ${contact.updatedBy.firstName} ${contact.updatedBy.lastName}`}
                </span>
              </div>
            </div>
          </div>

          <ContactConsentsCard
            contactId={contact.id}
            initialConsents={{
              consentEmail: contact.consentEmail,
              consentPhone: contact.consentPhone,
              consentSms: contact.consentSms,
              consentPostal: contact.consentPostal,
              consentCustom: contact.consentCustom,
              noContact: contact.noContact
            }}
          />

          {/* Historique */}
          <div id="history-card" className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} /> Historique
            </h2>
            {auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {auditLogs.slice(0, 8).map((log: any, i: number) => (
                  <div key={log.id} style={{
                    display: 'flex', gap: '0.75rem', paddingBottom: '0.85rem',
                    borderBottom: i < Math.min(auditLogs.length, 8) - 1 ? '1px solid #f1f5f9' : 'none',
                    marginBottom: i < Math.min(auditLogs.length, 8) - 1 ? '0.85rem' : 0,
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem',
                    }}>
                      {log.user ? `${log.user.firstName?.[0]}${log.user.lastName?.[0]}`.toUpperCase() : '⚙'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                        {auditLabel(log.action)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'}
                        {' · '}
                        {log.createdAt.toLocaleDateString('fr-FR')} à {log.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Aucun historique disponible.</p>
            )}
          </div>
        </div>

        {/* ═══ COLONNE DROITE ══════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Tâches liées */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} style={{ color: 'var(--primary)' }} />
              Tâches liées
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                {linkedTasks.length}
              </span>
            </h2>
            {linkedTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedTasks.map(task => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="contact-link-row" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 0.85rem', borderRadius: '8px',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{task.title}</div>
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                        {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Non assigné'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.73rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 600,
                      background: task.status === 'DONE' ? '#dcfce7' : task.status === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9',
                      color: task.status === 'DONE' ? '#15803d' : task.status === 'IN_PROGRESS' ? '#1d4ed8' : '#64748b',
                    }}>
                      {task.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>Aucune tâche liée</p>
                <Link href={`/tasks/new?contactId=${contact.id}`} className="button outline" style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                  + Créer une tâche
                </Link>
              </div>
            )}
          </div>

          {/* Courriers liées */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MailIcon size={16} style={{ color: 'var(--primary)' }} />
              Courriers liés
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                {linkedMails.length}
              </span>
            </h2>
            {linkedMails.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedMails.map(mail => (
                  <Link key={mail.id} href={`/mails/${mail.id}`} className="contact-link-row" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 0.85rem', borderRadius: '8px',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mail.subject}</div>
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                        {mail.type} · {new Date(mail.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.73rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                      {mail.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>Aucun courrier lié</p>
                <Link href={`/mails/new?contactId=${contact.id}`} className="button outline" style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                  + Créer un courrier
                </Link>
              </div>
            )}
          </div>

          {/* QE liées */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
              Questions Écrites liées
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                {linkedQEs.length}
              </span>
            </h2>
            {linkedQEs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedQEs.map(qe => (
                  <Link key={qe.id} href={`/qe/${qe.id}`} className="contact-link-row" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 0.85rem', borderRadius: '8px',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{qe.title}</div>
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                        {qe.ministry || 'Ministère non précisé'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.73rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                      {qe.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
                Aucune question écrite liée
              </p>
            )}
          </div>

          <ContactInteractionsTimeline
            contactId={contact.id}
            initialInteractions={JSON.parse(JSON.stringify(contact.interactions))}
          />

          {/* Formulaire d'édition */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Modifier le contact</h2>
            <EditContactForm contact={JSON.parse(JSON.stringify(contact))} allTags={allTags} dictionary={dictionary} fieldConfig={fieldConfig} supportLevels={supportLevels} />
          </div>

        </div>
      </div>

      {/* Styles hover — CSS :hover impossible via onMouse* en Server Component */}
      <style>{`
        .contact-link-row {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          transition: background 0.12s;
        }
        .contact-link-row:hover {
          background: #f1f5f9 !important;
          border-color: #e2e8f0;
        }
        .contact-coord-link {
          color: var(--foreground);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: color 0.12s;
        }
        .contact-coord-link:hover {
          color: var(--primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
