import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditContactForm from './edit-contact-form'
import { User, MapPin, Phone, Mail, Building, Clock } from 'lucide-react'
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

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'Contact', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } }
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }} className="hide-on-print">
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
          marginLeft: 'auto'
        }}>
          {contact.type}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Informations</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Phone size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.phone || 'Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Mail size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.email || 'Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <MapPin size={18} />
                <span style={{ color: 'var(--foreground)' }}>{contact.city || 'Non renseigné'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Building size={18} />
                <span style={{ color: 'var(--foreground)' }}>Secteur: {contact.territorySector || 'Non assigné'}</span>
              </div>
              
              {contact.tags && contact.tags.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {contact.tags.map((ct: any) => (
                    <span key={ct.tag.id} style={{ padding: '0.125rem 0.5rem', backgroundColor: ct.tag.color || '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem' }}>
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
                {auditLogs.map((log: any) => (
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

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Modifier le contact</h2>
          <EditContactForm contact={contact} />
        </div>
      </div>
    </div>
  )
}
