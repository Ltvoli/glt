import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, Clock, Building } from 'lucide-react'
import QEStatusForm from './qe-status-form'
import QEAttachments from './qe-attachments'
import QEResponseForm from './qe-response-form'

export default async function QEDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const qe = await prisma.writtenQuestion.findUnique({
    where: { id },
    include: {
      assignee: { select: { name: true } },
      attachments: true,
      links: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, status: true } }
        }
      }
    }
  })

  if (!qe) redirect('/qe')

  const linkedContacts = qe.links.filter(l => l.contact).map(l => l.contact)
  const linkedTasks = qe.links.filter(l => l.task).map(l => l.task)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/qe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux questions écrites
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', backgroundColor: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                {qe.type}
              </span>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{qe.title}</h1>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {qe.ministry ? `Adressée au ${qe.ministry}` : 'Ministère non renseigné'}
              {qe.anNumber ? ` • JO AN: ${qe.anNumber}` : ''}
            </p>
          </div>
          
          <QEStatusForm qeId={qe.id} currentStatus={qe.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Détails de la question</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thématique</p>
                <p style={{ fontWeight: 500 }}>{qe.theme || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Date de dépôt</p>
                <p style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--text-muted)" />
                  {qe.depositDate ? new Date(qe.depositDate).toLocaleDateString('fr-FR') : 'Non déposée'}
                </p>
              </div>
            </div>

            {qe.content && (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Texte de la question</p>
                <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {qe.content}
                </div>
              </div>
            )}

            {qe.notes && (
              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notes internes</p>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {qe.notes}
                </div>
              </div>
            )}
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} color={qe.responseContent ? "var(--success)" : "var(--text-muted)"} />
              Réponse du Ministère
            </h3>
            
            {qe.responseDate && (
               <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                 Réponse publiée le {new Date(qe.responseDate).toLocaleDateString('fr-FR')}
               </p>
            )}

            <QEResponseForm qeId={qe.id} initialResponse={qe.responseContent} />
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pièces jointes</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ajoutez ici le brouillon Word, ou le scan du Journal Officiel de la publication.</p>
            <QEAttachments qeId={qe.id} initialAttachments={qe.attachments} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Assignation</h3>
            {qe.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {qe.assignee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 500 }}>{qe.assignee.name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Collaborateur en charge</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Personne n'est assigné à cette question.</p>
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
