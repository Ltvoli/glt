import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload, Copy, Download } from 'lucide-react'
import ContactsTable from './contacts-table'
import AdvancedFilters from './advanced-filters'
import PaginationBar from './pagination-bar'
import ContactsTabs from './contacts-tabs'

import { buildWhereClause } from '@/lib/contacts-filter'
import { getSavedFilters } from './filters-actions'

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

  const [
    contacts,
    totalContacts,
    pendingDuplicates,
    allTags,
    cityCounts,
    territoryCounts,
    teamMembers,
    tagCounts,
    supportCounts,
    typeCounts,
    ageCounts,
    creatorCounts,
    savedFilters
  ] = await Promise.all([
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
    prisma.contact.groupBy({
      by: ['city'],
      where: { archivedAt: null, city: { not: null } },
      _count: { _all: true },
      orderBy: { city: 'asc' }
    }),
    prisma.contact.groupBy({
      by: ['territory'],
      where: { archivedAt: null, territory: { not: null } },
      _count: { _all: true },
      orderBy: { territory: 'asc' }
    }),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' }
    }),
    prisma.contactTag.groupBy({
      by: ['tagId'],
      where: { contact: { archivedAt: null } },
      _count: { _all: true }
    }),
    prisma.contact.groupBy({
      by: ['supportLevel'],
      where: { archivedAt: null },
      _count: { _all: true }
    }),
    prisma.contact.groupBy({
      by: ['type'],
      where: { archivedAt: null },
      _count: { _all: true }
    }),
    prisma.contact.groupBy({
      by: ['ageRange'],
      where: { archivedAt: null, ageRange: { not: null } },
      _count: { _all: true }
    }),
    prisma.contact.groupBy({
      by: ['createdById'],
      where: { archivedAt: null },
      _count: { _all: true }
    }),
    getSavedFilters()
  ])

  const totalPages = Math.ceil(totalContacts / itemsPerPage)

  // Map counts to unique lists and structures
  const uniqueCities = (cityCounts as any[]).map(c => ({
    name: c.city as string,
    count: c._count._all
  }))

  const uniqueTerritories = (territoryCounts as any[]).map(t => ({
    name: t.territory as string,
    count: t._count._all
  }))

  const tagCountsMap = new Map((tagCounts as any[]).map(tc => [tc.tagId, tc._count._all]))
  const allTagsWithCounts = allTags.map(t => ({
    id: t.id,
    name: t.name,
    count: tagCountsMap.get(t.id) || 0
  }))

  const supportCountsMap = new Map((supportCounts as any[]).map(sc => [sc.supportLevel, sc._count._all]))
  const supportLevelsWithCounts = [
    { value: '1', label: '1 — Très défavorable', count: supportCountsMap.get('1') || 0 },
    { value: '2', label: '2 — Défavorable', count: supportCountsMap.get('2') || 0 },
    { value: '3', label: '3 — Neutre', count: supportCountsMap.get('3') || 0 },
    { value: '4', label: '4 — Favorable', count: supportCountsMap.get('4') || 0 },
    { value: '5', label: '5 — Très favorable', count: supportCountsMap.get('5') || 0 }
  ]

  const typeCountsMap = new Map((typeCounts as any[]).map(tc => [tc.type, tc._count._all]))
  const contactTypesWithCounts = [
    { value: 'ELECTEUR', label: 'Électeur', count: typeCountsMap.get('ELECTEUR') || 0 },
    { value: 'ELU', label: 'Élu', count: typeCountsMap.get('ELU') || 0 },
    { value: 'CONTACT_MAIRIE', label: 'Contact Mairie', count: typeCountsMap.get('CONTACT_MAIRIE') || 0 },
    { value: 'ASSO', label: 'Association', count: typeCountsMap.get('ASSO') || 0 },
    { value: 'PARTENAIRE', label: 'Partenaire', count: typeCountsMap.get('PARTENAIRE') || 0 },
    { value: 'PRESSE', label: 'Presse', count: typeCountsMap.get('PRESSE') || 0 },
    { value: 'AUTRE', label: 'Autre', count: typeCountsMap.get('AUTRE') || 0 }
  ]

  const ageCountsMap = new Map((ageCounts as any[]).map(ac => [ac.ageRange, ac._count._all]))
  const ageRangesWithCounts = [
    { value: 'Moins de 18 ans', count: ageCountsMap.get('Moins de 18 ans') || 0 },
    { value: '18-25 ans', count: ageCountsMap.get('18-25 ans') || 0 },
    { value: '26-35 ans', count: ageCountsMap.get('26-35 ans') || 0 },
    { value: '36-50 ans', count: ageCountsMap.get('36-50 ans') || 0 },
    { value: '51-65 ans', count: ageCountsMap.get('51-65 ans') || 0 },
    { value: 'Plus de 65 ans', count: ageCountsMap.get('Plus de 65 ans') || 0 }
  ]

  const creatorCountsMap = new Map((creatorCounts as any[]).map(cc => [cc.createdById, cc._count._all]))
  const teamMembersWithCounts = teamMembers.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    count: creatorCountsMap.get(m.id) || 0
  }))

  // Serialize filter params for client-side export URLs
  const filterParamsObj = new URLSearchParams()
  const filterKeys = [
    'city', 'nameQ', 'phone', 'streetQ', 'q', 'tag', 'tagMode',
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
        allTags={allTagsWithCounts} 
        uniqueCities={uniqueCities} 
        uniqueTerritories={uniqueTerritories}
        teamMembers={teamMembersWithCounts}
        totalContactsCount={totalContacts}
        savedFilters={savedFilters}
        supportLevels={supportLevelsWithCounts}
        contactTypes={contactTypesWithCounts}
        ageRanges={ageRangesWithCounts}
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
