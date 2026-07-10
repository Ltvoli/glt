import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload, Copy, Download } from 'lucide-react'
import ContactsTable from './contacts-table'
import AdvancedFilters from './advanced-filters'
import PaginationBar from './pagination-bar'
import ContactsTabs from './contacts-tabs'

import { buildWhereClause } from '@/lib/contacts-filter'

// ──────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const currentPage  = Math.max(1, parseInt(params.page    || '1'))
  const itemsPerPage = Math.min(200, Math.max(10, parseInt(params.perPage || '50')))

  const where = buildWhereClause(params)

  const [contacts, totalContacts, pendingDuplicates, allTags, allCities, allTerritories, teamMembers] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastName: 'asc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        tags: { include: { tag: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.contact.count({ where }),
    prisma.duplicateCandidate.count({ where: { status: 'PENDING' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.contact.findMany({
      where: { archivedAt: null, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    }),
    prisma.contact.findMany({
      where: { archivedAt: null, territory: { not: null } },
      select: { territory: true },
      distinct: ['territory'],
      orderBy: { territory: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' }
    })
  ])

  const totalPages    = Math.ceil(totalContacts / itemsPerPage)
  const uniqueCities  = allCities.map(c => c.city).filter(Boolean) as string[]
  const uniqueTerritories = allTerritories.map(t => t.territory).filter(Boolean) as string[]

  // Serialize filter params for client-side export URLs
  const filterParamsObj = new URLSearchParams()
  const filterKeys = [
    'city', 'nameQ', 'phone', 'streetQ', 'q', 'tag',
    'lastInteraction', 'supportLevel', 'emailStatus', 'phoneStatus',
    'gender', 'addressStatus', 'contactType',
    'lastContactMobile', 'territory', 'creatorId', 'localisationStatus', 'permanenceStep',
    'ageRange', 'advanced_rules'
  ]
  for (const key of filterKeys) {
    if (params[key]) filterParamsObj.set(key, params[key]!)
  }
  const filterParams = filterParamsObj.toString()

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Contacts</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href={`/api/contacts/export?format=csv&${filterParams}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} /> Exporter (CSV)
          </a>
          <Link href="/contacts/import" className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={15} /> Import Qomon
          </Link>
          <Link href="/contacts/new" className="button" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Nouveau Contact
          </Link>
        </div>
      </div>

      <ContactsTabs />

      {/* ─── Duplicate warning ─── */}
      {pendingDuplicates > 0 && (
        <div style={{
          marginBottom: '1rem', padding: '0.75rem 1rem',
          backgroundColor: '#fef3c7', color: '#b45309',
          borderRadius: '8px', border: '1px solid #fcd34d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            <Copy size={16} />
            {pendingDuplicates} doublon(s) potentiel(s) détecté(s)
          </div>
          <Link href="/contacts/duplicates" className="button outline" style={{ fontSize: '0.8rem', padding: '4px 12px', borderColor: '#fcd34d', color: '#b45309', backgroundColor: 'white' }}>
            Gérer les doublons
          </Link>
        </div>
      )}

      {/* ─── Smart Search ─── */}
      <AdvancedFilters 
        allTags={allTags} 
        uniqueCities={uniqueCities} 
        uniqueTerritories={uniqueTerritories}
        teamMembers={teamMembers}
        totalContactsCount={totalContacts}
      />

      {/* ─── Count ─── */}
      <div style={{ marginBottom: '8px', color: '#64748b', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>
          <strong style={{ color: '#1e293b' }}>{totalContacts.toLocaleString('fr-FR')}</strong> contact(s) trouvé(s)
        </span>
        {totalPages > 1 && (
          <span style={{ color: '#94a3b8' }}>
            — page {currentPage} / {totalPages}
          </span>
        )}
      </div>

      {/* ─── Table ─── */}
      <ContactsTable
        contacts={contacts}
        totalContacts={totalContacts}
        filterParams={filterParams}
      />

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          currentParams={params}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  )
}
