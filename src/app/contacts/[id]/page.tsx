import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditContactForm from './edit-contact-form'
import { User, MapPin, Phone, Mail, Building, Clock } from 'lucide-react'

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const contact = await prisma.contact.findUnique({
    where: { id, archivedAt: null },
    include: { createdBy: true }
  })

  if (!contact) {
    notFound()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/contacts" className="button outline">Retour</Link>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <Clock size={16} />
                <span>Créé le {contact.createdAt.toLocaleDateString('fr-FR')} par {contact.createdBy.name}</span>
              </div>
            </div>
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
