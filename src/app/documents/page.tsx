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
import DocumentRow from './DocumentRow'
import DocumentListClient from './DocumentListClient'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import DocumentTemplateGenerateModal from './DocumentTemplateGenerateModal'

export default async function DocumentsPage({
  searchParams: searchParamsPromise
}: {
  searchParams: Promise<{ q?: string, type?: string, conf?: string, author?: string, relation?: string, status?: string, folder?: string, tag?: string }>
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

  // Compute breadcrumbs path recursively
  const buildBreadcrumbs = (folderId: string) => {
    const path: { id: string, name: string, color: string }[] = []
    let current = folders.find(f => f.id === folderId)
    while (current) {
      path.unshift({ id: current.id, name: current.name, color: current.color })
      const pid = current.parentId
      current = pid ? folders.find(f => f.id === pid) : undefined
    }
    return path
  }
  const breadcrumbs = activeFolder ? buildBreadcrumbs(activeFolder.id) : []

  // Folders to show at the current level
  const currentLevelFolders = folders.filter(f => f.parentId === (searchParams.folder || null))

  const [docs, usersData, folderCounts] = await Promise.all([
    getDocuments(
      searchParams.q,
      searchParams.type,
      searchParams.conf,
      searchParams.author,
      searchParams.relation,
      searchParams.status,
      searchParams.folder,
      searchParams.tag
    ),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
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
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DocumentTemplateGenerateModal folders={folders} defaultFolderId={searchParams.folder || null} />
          <FolderCreateModal parentId={searchParams.folder || null} />
          <DocumentCreateModal folders={folders} defaultFolderId={searchParams.folder || null} />
          <DocumentUploadModal folders={folders} defaultFolderId={searchParams.folder || null} />
        </div>
      </header>

      <DocumentFilters users={users} />

      {activeFolder && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '500', flexWrap: 'wrap' }}>
            <Link href={getClearLink()} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Bibliothèque
            </Link>
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <div key={bc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#cbd5e1' }}>/</span>
                  {isLast ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: bc.color }}>
                      <Folder size={18} style={{ fill: `${bc.color}20` }} />
                      {bc.name}
                    </span>
                  ) : (
                    <Link href={`/documents?folder=${bc.id}`} style={{ color: bc.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Folder size={18} style={{ fill: `${bc.color}20` }} />
                      {bc.name}
                    </Link>
                  )}
                </div>
              )
            })}
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
      )}

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
          {activeFolder ? 'Sous-dossiers' : 'Dossiers'}
        </h2>
        <FolderGrid folders={currentLevelFolders} counts={counts} searchParams={searchParams} />
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
          {activeFolder ? `Documents dans "${activeFolder.name}"` : 'Tous les documents'}
        </h2>
      </div>

      <DocumentListClient 
        docs={JSON.parse(JSON.stringify(docs))} 
        folders={folders} 
        activeFolderId={searchParams.folder || null} 
      />
    </div>
  )
}
