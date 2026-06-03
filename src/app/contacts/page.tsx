import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload, Download, Search, Copy, AlertTriangle } from 'lucide-react'
import ContactsTable from './contacts-table'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sector?: string; page?: string }>
}) {
  const { q, tag, sector, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1'))
  const itemsPerPage = 50

  const whereClause: any = { archivedAt: null }
  
  if (q) {
    whereClause.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { type: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (sector) {
    whereClause.territorySector = sector
  }

  if (tag) {
    whereClause.tags = {
      some: { tag: { name: tag } }
    }
  }

  const [contacts, totalContacts, pendingDuplicates, allTags, allSectors] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      include: { tags: { include: { tag: true } } }
    }),
    prisma.contact.count({ where: whereClause }),
    prisma.duplicateCandidate.count({ where: { status: 'PENDING' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.contact.findMany({
      where: { archivedAt: null, territorySector: { not: null } },
      select: { territorySector: true },
      distinct: ['territorySector']
    })
  ])

  const totalPages = Math.ceil(totalContacts / itemsPerPage)
  const uniqueSectors = allSectors.map(s => s.territorySector).filter(Boolean) as string[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Contacts</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/contacts/import" className="button outline">
            <Upload size={16} /> Import Qomon
          </Link>
          <a href="/api/contacts/export" className="button outline">
            <Download size={16} /> Export CSV
          </a>
          <Link href="/contacts/new" className="button">
            <Plus size={16} /> Nouveau Contact
          </Link>
        </div>
      </div>

      {pendingDuplicates > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fee2e2', color: 'var(--danger)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Copy size={20} />
            Attention : {pendingDuplicates} doublons potentiels détectés dans votre base.
          </div>
          <Link href="/contacts/duplicates" className="button outline danger" style={{ backgroundColor: 'white' }}>
            Gérer les doublons
          </Link>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="q" 
              defaultValue={q} 
              placeholder="Rechercher (Nom, Ville, Type...)" 
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          
          <div style={{ flex: '0 1 200px' }}>
            <select name="tag" defaultValue={tag || ''} className="form-control">
              <option value="">Tous les tags</option>
              {allTags.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <select name="sector" defaultValue={sector || ''} className="form-control">
              <option value="">Tous les secteurs</option>
              {uniqueSectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="button">Filtrer</button>
          
          {(q || tag || sector) && (
            <Link href="/contacts" className="button outline" style={{ textDecoration: 'none' }}>
              Effacer
            </Link>
          )}
        </form>
      </div>

      <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {totalContacts} contact(s) trouvé(s)
      </div>

      <ContactsTable contacts={contacts} />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {currentPage > 1 && (
            <Link href={`/contacts?q=${q || ''}&tag=${tag || ''}&sector=${sector || ''}&page=${currentPage - 1}`} className="button outline">
              Précédent
            </Link>
          )}
          <span style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            Page {currentPage} sur {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/contacts?q=${q || ''}&tag=${tag || ''}&sector=${sector || ''}&page=${currentPage + 1}`} className="button outline">
              Suivant
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
