import prisma from '@/lib/prisma'
import InviteForm from './invite-form'
import { AlertCircle, CalendarRange, CheckSquare } from 'lucide-react'
import Link from 'next/link'

type Props = {
  params: Promise<{
    token: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { token }
  })

  let errorTitle = ''
  let errorMsg = ''
  let ErrorIcon = AlertCircle

  if (!invitation) {
    errorTitle = 'Invitation invalide'
    errorMsg = "Ce lien d'invitation n'existe pas ou a été révoqué par l'administrateur."
  } else if (invitation.acceptedAt) {
    errorTitle = 'Invitation déjà acceptée'
    errorMsg = 'Cette invitation a déjà été utilisée pour créer un compte collaborateur.'
    ErrorIcon = CheckSquare
  } else if (new Date() > invitation.expiresAt) {
    errorTitle = 'Invitation expirée'
    errorMsg = "Ce lien d'invitation a expiré. Les liens d'invitation ont une durée de validité stricte de 48 heures pour des raisons de sécurité."
    ErrorIcon = CalendarRange
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '450px',
        border: '1px solid #e2e8f0'
      }}>
        {errorTitle ? (
          /* Error view */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: errorTitle.includes('accept') ? '#e6f4ea' : '#fce8e6',
              color: errorTitle.includes('accept') ? '#137333' : '#c5221f',
              borderRadius: '50%',
              marginBottom: '1.25rem'
            }}>
              <ErrorIcon size={24} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#1f2937' }}>
              {errorTitle}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              {errorMsg}
            </p>
            <Link 
              href="/login" 
              className="button outline"
              style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}
            >
              Retour à la page de connexion
            </Link>
          </div>
        ) : (
          /* Registration Form view */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '0.25rem 0.75rem',
                borderRadius: '16px',
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                Invitation reçue
              </span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                Création de votre compte
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Configurez votre profil pour rejoindre l'espace de travail.
              </p>
            </div>

            <InviteForm token={token} email={invitation!.email} />
          </div>
        )}
      </div>
    </div>
  )
}
