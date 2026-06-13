import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Calendar, User, MapPin, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

export default async function PermanencesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    commune?: string
    owner?: string
    dateStart?: string
    dateEnd?: string
    scoreMin?: string
    sortBy?: string
    sortOrder?: string
    page?: string
  }>
}) {
  const session = await getSession()
  if (!session || (!session.permissions.includes('permanences.read') && session.role !== 'SUPERADMIN')) {
    redirect('/auth/unauthorized')
  }

  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1'))
  const itemsPerPage = 20

  // Build filters
  const whereClause: any = { archivedAt: null }
  
  if (params.q) {
    whereClause.title = { contains: params.q, mode: 'insensitive' }
  }
  if (params.status && params.status !== 'all') {
    whereClause.status = params.status
  }
  if (params.commune && params.commune !== 'all') {
    whereClause.locations = {
      some: {
        communeName: { contains: params.commune, mode: 'insensitive' }
      }
    }
  }
  if (params.owner && params.owner !== 'all') {
    whereClause.ownerUserId = params.owner
  }
  if (params.dateStart || params.dateEnd) {
    whereClause.scheduledStartDate = {}
    if (params.dateStart) {
      whereClause.scheduledStartDate.gte = new Date(params.dateStart)
    }
    if (params.dateEnd) {
      whereClause.scheduledStartDate.lte = new Date(params.dateEnd)
    }
  }
  if (params.scoreMin) {
    whereClause.score = { gte: parseInt(params.scoreMin) }
  }

  // Sorting
  const sortBy = params.sortBy || 'scheduledStartDate'
  const sortOrder = params.sortOrder || 'desc'
  const orderBy: any = {}
  orderBy[sortBy] = sortOrder

  const [permanences, totalCount, usersData, communes] = await Promise.all([
    prisma.mobilePermanence.findMany({
      where: whereClause,
      orderBy,
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        ownerUser: true,
        locations: true
      }
    }),
    prisma.mobilePermanence.count({ where: whereClause }),
    prisma.user.findMany({ 
      where: { isActive: true }, 
      select: { id: true, firstName: true, lastName: true },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    }),
    prisma.commune.findMany({ orderBy: { name: 'asc' } })
  ])

  const users = usersData.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }))

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const buildUrl = (newParams: Record<string, string | null>) => {
    const updated = { ...params, ...newParams }
    const urlParams = new URLSearchParams()
    Object.entries(updated).forEach(([key, val]) => {
      if (val) urlParams.set(key, val)
    })
    return `/permanences?${urlParams.toString()}`
  }

  const toggleSort = (field: string) => {
    const isCurrent = sortBy === field
    const newOrder = isCurrent && sortOrder === 'asc' ? 'desc' : 'asc'
    return buildUrl({ sortBy: field, sortOrder: newOrder, page: '1' })
  }

  const getScoreColor = (score: number) => {
    if (score < 50) return 'var(--danger)'
    if (score < 80) return 'var(--warning)'
    return 'var(--success)'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Brouillon'
      case 'IN_PROGRESS': return 'En préparation'
      case 'TO_CORRECT': return 'À corriger'
      case 'READY': return 'Prête'
      case 'VALIDATED': return 'Validée'
      case 'ARCHIVED': return 'Archivée'
      default: return status
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DRAFT': return { backgroundColor: '#e2e8f0', color: '#475569' }
      case 'IN_PROGRESS': return { backgroundColor: '#dbeafe', color: '#1e40af' }
      case 'TO_CORRECT': return { backgroundColor: '#fee2e2', color: '#991b1b' }
      case 'READY': return { backgroundColor: '#fef3c7', color: '#92400e' }
      case 'VALIDATED': return { backgroundColor: '#d1fae5', color: '#065f46' }
      case 'ARCHIVED': return { backgroundColor: '#f3f4f6', color: '#374151' }
      default: return { backgroundColor: '#e2e8f0', color: '#475569' }
    }
  }

  const isReadOnly = session.role === 'READONLY'

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Permanences Mobiles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Planification, préparation logistique, phoning et visites de commerces.
          </p>
        </div>
        {!isReadOnly && (
          <Link href="/permanences/new" className="button">
            <Plus size={16} /> Nouvelle Permanence
          </Link>
        )}
      </div>

      {/* FILTERS */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          <SlidersHorizontal size={16} /> Filtres
        </h3>
        <form method="GET" action="/permanences" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Recherche</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                name="q" 
                defaultValue={params.q || ''} 
                placeholder="Titre de la permanence..." 
                className="form-control"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Statut</label>
            <select name="status" className="form-control" defaultValue={params.status || 'all'}>
              <option value="all">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="IN_PROGRESS">En préparation</option>
              <option value="TO_CORRECT">À corriger</option>
              <option value="READY">Prête</option>
              <option value="VALIDATED">Validée</option>
              <option value="ARCHIVED">Archivée</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Commune</label>
            <select name="commune" className="form-control" defaultValue={params.commune || 'all'}>
              <option value="all">Toutes les communes</option>
              {communes.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.zipCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Responsable</label>
            <select name="owner" className="form-control" defaultValue={params.owner || 'all'}>
              <option value="all">Tous</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Date début</label>
            <input type="date" name="dateStart" className="form-control" defaultValue={params.dateStart || ''} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Date fin</label>
            <input type="date" name="dateEnd" className="form-control" defaultValue={params.dateEnd || ''} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Score min (%)</label>
            <input type="number" name="scoreMin" min="0" max="100" className="form-control" defaultValue={params.scoreMin || ''} placeholder="0-100" />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="submit" className="button" style={{ flex: 1 }}>Filtrer</button>
            <Link href="/permanences" className="button outline" style={{ padding: '0.6rem 1rem' }}>Réinitialiser</Link>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>
                <Link href={toggleSort('title')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Titre <ArrowUpDown size={14} />
                </Link>
              </th>
              <th>Commune(s)</th>
              <th>
                <Link href={toggleSort('scheduledStartDate')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Date <ArrowUpDown size={14} />
                </Link>
              </th>
              <th>
                <Link href={toggleSort('status')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Statut <ArrowUpDown size={14} />
                </Link>
              </th>
              <th>
                <Link href={toggleSort('score')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Score de prép. <ArrowUpDown size={14} />
                </Link>
              </th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {permanences.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Aucune permanence trouvée.
                </td>
              </tr>
            ) : (
              permanences.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/permanences/${p.id}`} className="text-blue-600 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    {p.locations.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {p.locations.map(loc => (
                          <span key={loc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', padding: '0.1rem 0.4rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem' }}>
                            <MapPin size={10} /> {loc.communeName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-gray-400">Non défini</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(p.scheduledStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      ...getStatusStyle(p.status)
                    }}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', minWidth: '60px', overflow: 'hidden' }}>
                        <div style={{ width: `${p.score}%`, height: '100%', backgroundColor: getScoreColor(p.score), borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.875rem', color: getScoreColor(p.score) }}>
                        {p.score}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                      <User size={14} className="text-gray-400" />
                      {p.ownerUser.name}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {currentPage > 1 && (
            <Link href={buildUrl({ page: (currentPage - 1).toString() })} className="button outline">
              Précédent
            </Link>
          )}
          <span style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem' }}>
            Page {currentPage} sur {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={buildUrl({ page: (currentPage + 1).toString() })} className="button outline">
              Suivant
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
