import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PreviewClient from './preview-client'

export default async function MailPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const mail = await prisma.mailCase.findUnique({
    where: { id },
    include: {
      assignee: { select: { name: true } },
      links: {
        include: {
          contact: true
        }
      }
    }
  })

  if (!mail) redirect('/mails')

  // Récupérer les modèles en ligne uniquement
  const templates = await prisma.documentTemplate.findMany({
    where: {
      entityType: 'MAIL',
      htmlContent: { not: null }
    },
    select: {
      id: true,
      name: true,
      htmlContent: true
    }
  })

  // Formater les données pour le composant client
  const primaryContact = mail.links.find(l => l.contact)?.contact || ({} as any)
  const civilite = primaryContact.gender === 'M' ? 'Monsieur' : primaryContact.gender === 'F' ? 'Madame' : 'Monsieur/Madame'
  const fullAddress = primaryContact.city 
    ? `${primaryContact.streetNumber || ''} ${primaryContact.streetName || ''}\n${primaryContact.postalCode || ''} ${primaryContact.city}`
    : (mail.city || '')

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const variablesMap = {
    '{en_tete_officielle}': `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #ef4444; padding-bottom: 0.75rem; margin-bottom: 2.5rem; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <div style="width: 4px; height: 35px; background-color: #1e3a8a; display: inline-block;"></div>
          <div style="width: 4px; height: 35px; background-color: #ffffff; border: 1px solid #cbd5e1; display: inline-block;"></div>
          <div style="width: 4px; height: 35px; background-color: #b91c1c; display: inline-block;"></div>
          <div style="margin-left: 0.5rem; display: inline-block; vertical-align: middle; text-align: left;">
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; line-height: 1.1;">Assemblée Nationale</h3>
            <p style="margin: 0; font-size: 0.78rem; font-weight: 600; color: #475569;">Lionel TIVOLI • Député</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 0.7rem; color: #64748b; line-height: 1.25;">
          <p style="margin: 0; font-weight: 700; color: #1e293b;">Alpes-Maritimes (2ème Circonscription)</p>
          <p style="margin: 0;">contact@lioneltivoli.fr • www.lioneltivoli.fr</p>
        </div>
      </div>
    `,
    '{civilite_expediteur}': civilite,
    '{expediteur_prenom}': primaryContact.firstName || '',
    '{expediteur_nom}': primaryContact.lastName || '',
    '{expediteur_adresse}': fullAddress.replace(/\n/g, '<br />'),
    '{reference}': mail.reference,
    '{objet}': mail.subject,
    '{date_courrier}': dateStr,
    '{corps_reponse}': mail.content || '',
    '{nom_collaborateur}': mail.assignee?.name || '',
    '{signature_elu}': `
      <div style="margin-top: 2rem; text-align: right; float: right; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <p style="margin-bottom: 0.25rem; font-weight: 700; font-size: 0.9rem; color: #1e293b;">Lionel TIVOLI</p>
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0; margin-bottom: 0.25rem;">Député des Alpes-Maritimes</p>
        <div style="font-family: 'Caveat', cursive, sans-serif; font-size: 2.2rem; color: #1d4ed8; transform: rotate(-4deg); display: inline-block; margin-top: 0.25rem; font-weight: 700;">
          Lionel Tivoli
        </div>
      </div>
    `
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '1.5rem' }}>
        <Link href={`/mails/${mail.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Retour au courrier
        </Link>
      </div>

      <PreviewClient 
        mail={mail}
        templates={templates}
        variablesMap={variablesMap}
        primaryContactEmail={primaryContact.email || ''}
        primaryContactName={`${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`}
      />
    </div>
  )
}
