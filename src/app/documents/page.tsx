import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getDocuments } from './actions'
import { FileText, Download, Link as LinkIcon, Folder } from 'lucide-react'
import DocumentUploadModal from './DocumentUploadModal'
import DocumentActions from './DocumentActions'
import DocumentFilters from './DocumentFilters'
import Link from 'next/link'
import prisma from '@/lib/prisma'

const FOLDER_LABELS: Record<string, { label: string; type: string; color: string }> = {
  PDF: { label: 'Documents PDF', type: 'PDF', color: '#ef4444' },
  WORD: { label: 'Fichiers Word', type: 'WORD', color: '#2563eb' },
  COURRIER: { label: 'Courriers', type: 'COURRIER', color: '#10b981' },
  QE: { label: 'Questions Écrites', type: 'QE', color: '#8b5cf6' },
  NOTE: { label: 'Notes internes', type: 'NOTE', color: '#f59e0b' },
  AUTRE: { label: 'Autres', type: 'AUTRE', color: '#64748b' }
}

export default async function DocumentsPage({
  searchParams: searchParamsPromise
}: {
  searchParams: Promise<{ q?: string, type?: string, conf?: string, author?: string, relation?: string, status?: string }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const searchParams = await searchParamsPromise

  const getFolderLink = (type: string) => {
    const params = new URLSearchParams()
    if (searchParams.q) params.set('q', searchParams.q)
    params.set('type', type)
    if (searchParams.conf) params.set('conf', searchParams.conf)
    if (searchParams.author) params.set('author', searchParams.author)
    if (searchParams.relation) params.set('relation', searchParams.relation)
    if (searchParams.status) params.set('status', searchParams.status)
    return `/documents?${params.toString()}`
  }

  const getClearLink = () => {
    const params = new URLSearchParams()
    if (searchParams.q) params.set('q', searchParams.q)
    // omit type
    if (searchParams.conf) params.set('conf', searchParams.conf)
    if (searchParams.author) params.set('author', searchParams.author)
    if (searchParams.relation) params.set('relation', searchParams.relation)
    if (searchParams.status) params.set('status', searchParams.status)
    const qs = params.toString()
    return qs ? `/documents?${qs}` : '/documents'
  }

  const activeFolder = searchParams.type && FOLDER_LABELS[searchParams.type]

  const [docs, usersData, typeCounts] = await Promise.all([
    getDocuments(
      searchParams.q,
      searchParams.type,
      searchParams.conf,
      searchParams.author,
      searchParams.relation,
      searchParams.status
    ),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    }),
    prisma.document.groupBy({
      by: ['documentType'],
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

  const folderCounts: Record<string, number> = {
    PDF: 0,
    WORD: 0,
    COURRIER: 0,
    QE: 0,
    NOTE: 0,
    AUTRE: 0
  }

  typeCounts.forEach(c => {
    if (c.documentType in folderCounts) {
      folderCounts[c.documentType] = c._count._all
    } else {
      folderCounts.AUTRE += c._count._all
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
        
        <DocumentUploadModal />
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
              {activeFolder.label}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {Object.entries(FOLDER_LABELS).map(([key, info]) => {
              const count = folderCounts[key] || 0;
              return (
                <Link
                  key={key}
                  href={getFolderLink(key)}
                  className="card-interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.25rem',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '10px',
                    backgroundColor: `${info.color}15`,
                    color: info.color
                  }}>
                    <Folder size={28} style={{ fill: `${info.color}20` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#1e293b' }}>
                      {info.label}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      {count} document{count > 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          
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
              <DocumentActions document={JSON.parse(JSON.stringify(doc))} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
