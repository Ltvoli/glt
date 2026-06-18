import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getDocuments } from './actions'
import { FileText, Download, Link as LinkIcon, Folder } from 'lucide-react'
import DocumentUploadModal from './DocumentUploadModal'
import DocumentCreateModal from './DocumentCreateModal'
import FolderCreateModal from './FolderCreateModal'
import FolderGrid from './FolderGrid'
import DocumentActions from './DocumentActions'
import DocumentFilters from './DocumentFilters'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function DocumentsPage({
  searchParams: searchParamsPromise
}: {
  searchParams: Promise<{ q?: string, type?: string, conf?: string, author?: string, relation?: string, status?: string, folder?: string }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const searchParams = await searchParamsPromise

  // Load and seed folders
  let folders = await prisma.documentFolder.findMany({
    orderBy: { name: 'asc' }
  })
  if (folders.length === 0) {
    const defaults = [
      { name: 'Documents PDF', color: '#ef4444' },
      { name: 'Fichiers Word', color: '#2563eb' },
      { name: 'Courriers', color: '#10b981' },
      { name: 'Questions Écrites', color: '#8b5cf6' },
      { name: 'Notes internes', color: '#f59e0b' }
    ]
    await prisma.documentFolder.createMany({
      data: defaults
    })
    folders = await prisma.documentFolder.findMany({
      orderBy: { name: 'asc' }
    })
  }

  const getClearLink = () => {
    const params = new URLSearchParams()
    if (searchParams.q) params.set('q', searchParams.q)
    if (searchParams.conf) params.set('conf', searchParams.conf)
    if (searchParams.author) params.set('author', searchParams.author)
    if (searchParams.relation) params.set('relation', searchParams.relation)
    if (searchParams.status) params.set('status', searchParams.status)
    const qs = params.toString()
    return qs ? `/documents?${qs}` : '/documents'
  }

  const activeFolder = searchParams.folder ? folders.find(f => f.id === searchParams.folder) : null

  const [docs, usersData, folderCounts] = await Promise.all([
    getDocuments(
      searchParams.q,
      searchParams.type,
      searchParams.conf,
      searchParams.author,
      searchParams.relation,
      searchParams.status,
      searchParams.folder
    ),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    }),
    prisma.document.groupBy({
      by: ['folderId'],
      _count: {
        _all: true
      },
      where: {
        archivedAt: null,
        ...(session.role === 'USER' || session.role === 'READONLY' ? {
          confidentiality: { in: ['INTERNE', 'RESTREINT'] }
        } : {})
      }
    })
  ])

  const counts: Record<string, number> = {}
  folderCounts.forEach(c => {
    if (c.folderId) {
      counts[c.folderId] = c._count._all
    }
  })

  const users = usersData.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }))

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Bibliothèque de Documents</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gérez tous les documents liés aux contacts, tâches, QE, etc.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <FolderCreateModal />
          <DocumentCreateModal folders={folders} />
          <DocumentUploadModal folders={folders} />
        </div>
      </header>

      <DocumentFilters users={users} />

      {activeFolder ? (
        /* Breadcrumbs when inside a folder */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '500' }}>
            <Link href={getClearLink()} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Bibliothèque
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: activeFolder.color }}>
              <Folder size={18} style={{ fill: `${activeFolder.color}20` }} />
              {activeFolder.name}
            </span>
          </div>
          
          <Link
            href={getClearLink()}
            className="button outline"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            Retourner aux dossiers
          </Link>
        </div>
      ) : (
        /* Folders grid when at root */
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>Dossiers</h2>
          <FolderGrid folders={folders} counts={counts} searchParams={searchParams} />
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>Tous les documents</h2>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {docs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            Aucun document trouvé.
          </div>
        )}
        {docs.map(doc => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a 
                href={`/api/documents/${doc.id}/download`} 
                target="_blank" 
                rel="noreferrer"
                title="Ouvrir le document"
                className="document-icon-link"
              >
                <FileText size={32} />
              </a>
              <div>
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a 
                    href={`/api/documents/${doc.id}/download`} 
                    target="_blank" 
                    rel="noreferrer"
                    title="Ouvrir le document"
                    className="document-title-link"
                  >
                    {doc.title}
                  </a>
                  
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
              <DocumentActions document={JSON.parse(JSON.stringify(doc))} folders={folders} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
