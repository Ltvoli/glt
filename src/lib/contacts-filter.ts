// src/lib/contacts-filter.ts

export function buildWhereClause(params: Record<string, string | undefined>) {
  const where: any = { archivedAt: null }
  const andClauses: any[] = []

  // ── New chip-based filters ──────────────────────────────
  if (params.nameQ) {
    const terms = params.nameQ.split(',').map(t => t.trim()).filter(Boolean)
    for (const term of terms) {
      andClauses.push({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName:  { contains: term, mode: 'insensitive' } },
        ]
      })
    }
  }

  if (params.city) {
    const cities = params.city.split(',').map(c => c.trim()).filter(Boolean)
    if (cities.length === 1) {
      where.city = { equals: cities[0], mode: 'insensitive' }
    } else if (cities.length > 1) {
      andClauses.push({ OR: cities.map(c => ({ city: { equals: c, mode: 'insensitive' } })) })
    }
  }

  if (params.phone) {
    const phones = params.phone.split(',').map(p => p.replace(/[\s\.\-]/g, '')).filter(Boolean)
    if (phones.length > 0) {
      andClauses.push({
        OR: phones.flatMap(p => [
          { mobilePhone: { contains: p, mode: 'insensitive' } },
          { phone:       { contains: p, mode: 'insensitive' } },
        ])
      })
    }
  }

  if (params.streetQ) {
    const terms = params.streetQ.split(',').map(t => t.trim()).filter(Boolean)
    for (const term of terms) {
      andClauses.push({ streetName: { contains: term, mode: 'insensitive' } })
    }
  }

  // ── Legacy q param (backward compat) ───────────────────
  if (params.q) {
    andClauses.push({
      OR: [
        { firstName:    { contains: params.q, mode: 'insensitive' } },
        { lastName:     { contains: params.q, mode: 'insensitive' } },
        { city:         { contains: params.q, mode: 'insensitive' } },
        { email:        { contains: params.q, mode: 'insensitive' } },
        { mobilePhone:  { contains: params.q, mode: 'insensitive' } },
        { streetName:   { contains: params.q, mode: 'insensitive' } },
      ]
    })
  }

  // ── Advanced filters ────────────────────────────────────
  if (params.contactType && params.contactType !== 'all') where.type = params.contactType
  if (params.tag)     where.tags = { some: { tag: { name: params.tag } } }
  if (params.lastInteraction) where.lastInteraction = { gte: new Date(params.lastInteraction) }
  if (params.supportLevel)    where.supportLevel = params.supportLevel

  if (params.emailStatus && params.emailStatus !== 'all') {
    if (params.emailStatus === 'has_email') where.email = { not: null }
    if (params.emailStatus === 'no_email')  where.email = null
  }

  if (params.phoneStatus && params.phoneStatus !== 'all') {
    if (params.phoneStatus === 'mobile') where.mobilePhone = { not: null }
    else if (params.phoneStatus === 'any') {
      andClauses.push({ OR: [{ mobilePhone: { not: null } }, { phone: { not: null } }] })
    } else if (params.phoneStatus === 'none') {
      where.mobilePhone = null
      where.phone = null
    }
  }

  if (params.gender && params.gender !== 'all')         where.gender = params.gender
  if (params.addressStatus && params.addressStatus !== 'all') {
    if (params.addressStatus === 'unknown') {
      where.city = null
      where.streetName = null
      where.postalCode = null
    } else if (params.addressStatus === 'npai') {
      where.isNpai = true
    } else if (params.addressStatus === 'valid') {
      where.isNpai = false
    }
  }

  if (andClauses.length > 0) where.AND = andClauses
  return where
}
