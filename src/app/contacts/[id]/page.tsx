import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditContactForm from './edit-contact-form'
import ArchiveButton from './archive-button'
import { User, MapPin, Phone, Mail, Building, Clock, CheckSquare, Mail as MailIcon, HelpCircle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'

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
      tags: { include: { tag: true } }
    }
  })

  if (!contact) {
    notFound()
  }

  const [auditLogs, linkedTasks, linkedMails, linkedQEs, allTags] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: 'Contact', entityId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    }),
    prisma.task.findMany({
      where: { links: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.mailCase.findMany({
      where: { links: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.writtenQuestion.findMany({
      where: { links: { some: { contactId: id } } },
      orderBy: { createdAt: 'desc' },
      include: { assignee: true }
    }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } })
  ])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }} className="hide-on-print">
        <Link href="/contacts" className="button outline">Retour</Link>
        <PrintButton />
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
          {contact.firstName} {contact.lastName}
        </h1>
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          backgroundColor: '#eff6ff', 
          color: 'var(--primary)', 
          borderRadius: '9999px', 
          fontSize: '0.875rem', 
          fontWeight: 500,
        }}>
          {contact.type}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <Link href={`/tasks/new?contactId=${contact.id}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={16} /> + Tâche
          </Link>
          <Link href={`/mails/new?contactId=${contact.id}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MailIcon size={16} /> + Courrier
          </Link>
          <ArchiveButton contactId={contact.id} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Colonne Gauche : Infos & Historique */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Informations</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Phone size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.phone || 'Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Phone size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.mobilePhone || 'Mobile: Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Mail size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.email || 'Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <MapPin size={18} />
                <span style={{ color: 'var(--foreground)' }}>
                  {[contact.streetNumber, contact.streetName, contact.postalCode, contact.city].filter(Boolean).join(' ') || 'Non renseigné'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Building size={18} />
                <span style={{ color: 'var(--foreground)' }}>Secteur: {contact.territorySector || 'Non assigné'}</span>
              </div>
              
              {contact.tags && contact.tags.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {contact.tags.map((ct: any) => (
                    <span key={ct.tag.id} style={{ padding: '0.125rem 0.5rem', backgroundColor: ct.tag.color || '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', color: '#1e293b' }}>
                      {ct.tag.name}
                    </span>
                  ))}
                </div>
              )}

              {contact.notes && (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <strong>Notes :</strong><br/>
                  {contact.notes}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <Clock size={16} />
                <span>Créé le {contact.createdAt.toLocaleDateString('fr-FR')} par {contact.createdBy.name}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Historique (Audit)</h2>
            {auditLogs.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {auditLogs.slice(0, 5).map((log: any) => (
                  <li key={log.id} style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{log.user.name}</span> a 
                    <span style={{ fontWeight: 600, color: 'var(--primary)', margin: '0 0.25rem' }}>{log.action}</span>
                    le {log.createdAt.toLocaleDateString('fr-FR')} à {log.createdAt.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aucun historique disponible.</p>
            )}
          </div>
        </div>

        {/* Colonne Droite : Vision 360 & Modification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} color="var(--primary)" /> Tâches liées ({linkedTasks.length})
            </h2>
            {linkedTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {linkedTasks.map(task => (
                  <Link key={task.id} href={`/tasks/${task.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigné à : {task.assignee?.name || 'Non assigné'}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', height: 'fit-content' }}>
                      {task.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune tâche liée à ce contact.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MailIcon size={20} color="var(--primary)" /> Courriers liés ({linkedMails.length})
            </h2>
            {linkedMails.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {linkedMails.map(mail => (
                  <Link key={mail.id} href={`/mails/${mail.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{mail.subject}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {mail.type} - {new Date(mail.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', height: 'fit-content' }}>
                      {mail.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun courrier lié à ce contact.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={20} color="var(--primary)" /> QE liées ({linkedQEs.length})
            </h2>
            {linkedQEs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {linkedQEs.map(qe => (
                  <Link key={qe.id} href={`/qe/${qe.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{qe.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{qe.ministry || 'Ministère non précisé'}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', height: 'fit-content' }}>
                      {qe.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune QE liée à ce contact.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Modifier le contact</h2>
            <EditContactForm contact={contact} allTags={allTags} />
          </div>

        </div>
      </div>
    </div>
  )
}
