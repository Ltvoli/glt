import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload, Download, Search, Copy, AlertTriangle } from 'lucide-react'
import ContactsTable from './contacts-table'

import AdvancedFilters from './advanced-filters'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    q?: string; tag?: string; sector?: string; page?: string;
    lastInteraction?: string; supportLevel?: string; meetingStep?: string;
    emailStatus?: string; phoneStatus?: string; gender?: string; addressStatus?: string;
  }>
}) {
  const { 
    q, tag, sector, page, 
    lastInteraction, supportLevel, meetingStep, 
    emailStatus, phoneStatus, gender, addressStatus 
  } = await searchParams
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

  if (lastInteraction) {
    // Assuming the user wants contacts since or equal to this date
    whereClause.lastInteraction = { gte: new Date(lastInteraction) }
  }

  if (supportLevel) {
    whereClause.supportLevel = supportLevel
  }

  if (meetingStep && meetingStep !== 'all') {
    whereClause.meetingStep = meetingStep
  }

  if (emailStatus && emailStatus !== 'all') {
    if (emailStatus === 'has_email') whereClause.email = { not: null }
    else if (emailStatus === 'no_email') whereClause.email = null
  }

  if (phoneStatus && phoneStatus !== 'all') {
    if (phoneStatus === 'mobile') {
      whereClause.mobilePhone = { not: null }
    } else if (phoneStatus === 'any') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { mobilePhone: { not: null } },
            { phone: { not: null } }
          ]
        }
      ]
    } else if (phoneStatus === 'none') {
      whereClause.mobilePhone = null
      whereClause.phone = null
    }
  }

  if (gender && gender !== 'all') {
    whereClause.gender = gender
  }

  if (addressStatus && addressStatus !== 'all') {
    if (addressStatus === 'unknown') {
      whereClause.city = null
      whereClause.streetName = null
      whereClause.address = null
      whereClause.postalCode = null
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

  const buildPaginationUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (tag) params.set('tag', tag)
    if (sector) params.set('sector', sector)
    if (lastInteraction) params.set('lastInteraction', lastInteraction)
    if (supportLevel) params.set('supportLevel', supportLevel)
    if (meetingStep) params.set('meetingStep', meetingStep)
    if (emailStatus) params.set('emailStatus', emailStatus)
    if (phoneStatus) params.set('phoneStatus', phoneStatus)
    if (gender) params.set('gender', gender)
    if (addressStatus) params.set('addressStatus', addressStatus)
    params.set('page', newPage.toString())
    return `/contacts?${params.toString()}`
  }

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

      <AdvancedFilters allTags={allTags} uniqueSectors={uniqueSectors} />

      <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {totalContacts} contact(s) trouvé(s)
      </div>

      <ContactsTable contacts={contacts} />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {currentPage > 1 && (
            <Link href={buildPaginationUrl(currentPage - 1)} className="button outline">
              Précédent
            </Link>
          )}
          <span style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            Page {currentPage} sur {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={buildPaginationUrl(currentPage + 1)} className="button outline">
              Suivant
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
