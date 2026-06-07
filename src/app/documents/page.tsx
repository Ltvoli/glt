import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getDocuments } from './actions'
import { FileText, Download, Link as LinkIcon } from 'lucide-react'
import DocumentUploadModal from './DocumentUploadModal'
import DocumentActions from './DocumentActions'
import DocumentFilters from './DocumentFilters'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: { q?: string, type?: string, conf?: string, author?: string, relation?: string, status?: string }
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const docs = await getDocuments(
    searchParams.q, 
    searchParams.type, 
    searchParams.conf,
    searchParams.author,
    searchParams.relation,
    searchParams.status
  )

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Bibliothèque de Documents</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gérez tous les documents liés aux contacts, tâches, QE, etc.</p>
        </div>
        
        <DocumentUploadModal />
      </header>

      <DocumentFilters users={users} />

      <div style={{ display: 'grid', gap: '1rem' }}>
        {docs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            Aucun document trouvé.
          </div>
        )}
        {docs.map(doc => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FileText size={32} color="#94a3b8" />
              <div>
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {doc.title}
                  
                  {doc.status === 'PENDING' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '0.7rem', borderRadius: '4px' }}>À valider</span>}
                  {doc.status === 'REJECTED' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fecaca', color: '#991b1b', fontSize: '0.7rem', borderRadius: '4px' }}>Rejeté</span>}
                  {doc.status === 'DRAFT' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.7rem', borderRadius: '4px' }}>Brouillon</span>}

                  {doc.confidentiality === 'SENSIBLE' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '0.7rem', borderRadius: '4px' }}>Sensible</span>}
                  {doc.confidentiality === 'RESTREINT' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.7rem', borderRadius: '4px' }}>Restreint</span>}
                  {doc.confidentiality === 'CONFIDENTIEL' && <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#fecaca', color: '#991b1b', fontSize: '0.7rem', borderRadius: '4px' }}>Confidentiel</span>}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {doc.documentType} • {(doc.size / 1024).toFixed(1)} KB • Par {doc.uploadedBy.name}
                  
                  {doc.contact && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      <LinkIcon size={12} /> <Link href={`/contacts/${doc.contact.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{doc.contact.firstName} {doc.contact.lastName}</Link>
                    </span>
                  )}
                  {doc.task && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      <LinkIcon size={12} /> <Link href={`/tasks/${doc.task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>Tâche: {doc.task.title}</Link>
                    </span>
                  )}
                  {doc.mailCase && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      <LinkIcon size={12} /> <Link href={`/mails/${doc.mailCase.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>Courrier: {doc.mailCase.reference}</Link>
                    </span>
                  )}
                  {doc.question && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      <LinkIcon size={12} /> <Link href={`/qe/${doc.question.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>QE: {doc.question.anNumber || doc.question.title}</Link>
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <DocumentActions document={doc} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
