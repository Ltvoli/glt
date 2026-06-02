import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload, Download, Search } from 'lucide-react'
import ContactsTable from './contacts-table'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  
  const whereClause = q
    ? {
        archivedAt: null,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { city: { contains: q } },
          { type: { contains: q } },
        ],
      }
    : { archivedAt: null }

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

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

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="q" 
              defaultValue={q} 
              placeholder="Rechercher par nom, commune, type..." 
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="button">Filtrer</button>
        </form>
      </div>

      <ContactsTable contacts={contacts} />
    </div>
  )
}
