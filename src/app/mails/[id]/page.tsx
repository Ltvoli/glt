import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Mail, AlertCircle, Clock, Printer } from 'lucide-react'
import MailStatusForm from './mail-status-form'
import MailAttachments from './mail-attachments'
import PrintButton from '@/components/PrintButton'
import GenerateLetterButton from '@/components/GenerateLetterButton'
import MailValidationActions from './mail-validation-actions'

export default async function MailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const mail = await prisma.mailCase.findUnique({
    where: { id },
    include: {
      assignee: { select: { name: true } },
      documents: true,
      links: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, status: true } }
        }
      }
    }
  })

  if (!mail) redirect('/mails')

  const dictionary = await prisma.appDictionary.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } })

  const linkedContacts = mail.links.filter(l => l.contact).map(l => l.contact)
  const linkedTasks = mail.links.filter(l => l.task).map(l => l.task)

  const templates = await prisma.documentTemplate.findMany({ where: { entityType: 'MAIL' }, select: { id: true, name: true } })

  const isAdmin = session.dbRole === 'ADMINISTRATEUR'
  const isPendingValidation = mail.validationStatus === 'A_VALIDER'

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
      <div className="no-print" style={{ marginBottom: '2rem' }}>
        <Link href="/mails" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux courriers
        </Link>
        
        {isPendingValidation && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c2410c' }}>
              <AlertCircle size={20} />
              <span style={{ fontWeight: 500 }}>Ce courrier est en attente de validation par un administrateur. Seul l'envoi est bloqué, la génération reste possible.</span>
            </div>
            {isAdmin && <MailValidationActions mailId={mail.id} />}
          </div>
        )}

        {mail.validationStatus === 'REJETE' && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 500 }}>Ce courrier a été rejeté. Veuillez le modifier et demander une nouvelle validation (ou en créer un nouveau).</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{mail.subject}</h1>
              {mail.urgency === 'HAUTE' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', color: 'var(--danger)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <AlertCircle size={14} /> URGENT
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Référence : {mail.reference} • {mail.type}</p>
          </div>
          

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href={`/tasks/new?title=Répondre au courrier : ${encodeURIComponent(mail.subject)}&dueDate=${mail.responseDueDate ? new Date(mail.responseDueDate).toISOString().split('T')[0] : ''}&mailId=${mail.id}`} className="button outline">
              Créer une tâche
            </Link>
            {mail.type === 'ENTRANT' && (
              <Link href={`/mails/new?parentMailCaseId=${mail.id}&subject=RE: ${encodeURIComponent(mail.subject)}`} className="button outline">
                Rédiger une réponse
              </Link>
            )}
            <PrintButton />
            <Link href={`/mails/${id}/edit`} className="button outline">Modifier</Link>
            {!isPendingValidation && (
              <MailStatusForm mailId={mail.id} currentStatus={mail.status} dictionary={dictionary} />
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          {mail.validationStatus !== 'REJETE' && (
            <GenerateLetterButton entityId={mail.id} entityType="MAIL" templates={templates} />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card" style={{ position: 'relative' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Détails du courrier</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{mail.type === 'ENTRANT' ? 'Date de réception' : 'Date d\'envoi'}</p>
                <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--text-muted)" />
                  {mail.type === 'ENTRANT' && mail.receiveDate ? new Date(mail.receiveDate).toLocaleDateString('fr-FR') : mail.sentDate ? new Date(mail.sentDate).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              {mail.responseDueDate && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Échéance cible</p>
                  <p style={{ fontWeight: 500, color: new Date(mail.responseDueDate) < new Date() && mail.status !== 'REPONDU' && mail.status !== 'CLASSE' ? 'var(--danger)' : 'inherit' }}>
                    {new Date(mail.responseDueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Canal</p>
                <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {mail.channel === 'POSTAL' ? <Package size={16} color="var(--text-muted)" /> : <Mail size={16} color="var(--text-muted)" />}
                  {mail.channel === 'POSTAL' ? 'Courrier Postal' : mail.channel === 'MAIL' ? 'Email' : 'Autre'}
                </p>
              </div>
              {mail.type === 'ENTRANT' ? (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Expéditeur</p>
                  <p style={{ fontWeight: 500 }}>{mail.senderName || '-'}</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Destinataire</p>
                  <p style={{ fontWeight: 500 }}>{mail.recipientName || '-'}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Commune</p>
                <p style={{ fontWeight: 500 }}>{mail.city || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Catégorie</p>
                <p style={{ fontWeight: 500 }}>{mail.category?.replace(/_/g, ' ') || '-'}</p>
              </div>
            </div>

            {mail.content && (
              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Contenu du courrier</p>
                <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {mail.content}
                </div>
              </div>
            )}

            {mail.notes && (
              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notes internes</p>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {mail.notes}
                </div>
              </div>
            )}
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pièces jointes</h3>
            <MailAttachments mailId={mail.id} initialAttachments={mail.documents} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Assignation</h3>
            {mail.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {mail.assignee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 500 }}>{mail.assignee.name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Collaborateur en charge</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Personne n'est assigné à ce courrier.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Contacts liés</h3>
            {linkedContacts.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedContacts.map((contact: any) => (
                  <li key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{contact.lastName} {contact.firstName}</span>
                    <Link href={`/contacts/${contact.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Voir</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aucun contact lié.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Tâches liées</h3>
            {linkedTasks.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {linkedTasks.map((task: any) => (
                  <li key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{task.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.status}</span>
                    </div>
                    <Link href={`/tasks/${task.id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Voir</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aucune tâche liée.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
