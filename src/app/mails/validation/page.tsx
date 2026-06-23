import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import MailValidationExpressClient from './validation-client'

export default async function ValidationExpressPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  // Seuls les Administrateurs et Superviseurs ont accès à la validation
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    redirect('/mails')
  }

  // Récupérer tous les courriers en attente de validation
  const mailsToValidate = await prisma.mailCase.findMany({
    where: {
      validationStatus: 'A_VALIDER'
    },
    include: {
      assignee: {
        select: {
          name: true
        }
      }
    },
    orderBy: [
      { urgency: 'desc' }, // URGENT en premier
      { createdAt: 'desc' }
    ]
  })

  const isAdmin = session.dbRole === 'ADMINISTRATEUR'

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <MailValidationExpressClient 
        initialMails={mailsToValidate as any} 
        isAdmin={isAdmin} 
      />
    </div>
  )
}
