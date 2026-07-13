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
  if (params.tag) {
    const tagNames = params.tag.split(',').map(t => t.trim()).filter(Boolean)
    if (tagNames.length > 0) {
      const tagMode = params.tagMode || 'or'
      if (tagMode === 'and') {
        for (const tagName of tagNames) {
          andClauses.push({
            tags: {
              some: {
                tag: {
                  name: { equals: tagName, mode: 'insensitive' }
                }
              }
            }
          })
        }
      } else if (tagMode === 'not') {
        where.tags = {
          none: {
            tag: {
              name: { in: tagNames, mode: 'insensitive' }
            }
          }
        }
      } else {
        // default: 'or'
        where.tags = {
          some: {
            tag: {
              name: { in: tagNames, mode: 'insensitive' }
            }
          }
        }
      }
    }
  }
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

  // ── Visual filter panel extensions ──────────────────────
  if (params.lastContactMobile) {
    where.lastContactMobile = { gte: new Date(params.lastContactMobile) }
  }

  if (params.territory) {
    where.territory = { equals: params.territory, mode: 'insensitive' }
  }

  if (params.creatorId) {
    where.createdById = params.creatorId
  }

  if (params.ageRange) {
    where.ageRange = params.ageRange
  }

  if (params.localisationStatus && params.localisationStatus !== 'all') {
    if (params.localisationStatus === 'transmitted') {
      andClauses.push({
        AND: [
          { streetName: { not: null } },
          { city: { not: null } }
        ]
      })
    }
  }

  if (params.permanenceStep && params.permanenceStep !== 'all') {
    if (params.permanenceStep === 'not_contacted') {
      where.permanenceContacts = { none: {} }
    } else {
      let statusList: string[] = []
      if (params.permanenceStep === 'to_do') statusList = ['IN_PROGRESS', 'TO_CORRECT']
      else if (params.permanenceStep === 'upcoming') statusList = ['DRAFT']
      else if (params.permanenceStep === 'in_progress') statusList = ['READY']
      else if (params.permanenceStep === 'response') statusList = ['VALIDATED']

      if (statusList.length > 0) {
        where.permanenceContacts = {
          some: {
            permanence: {
              status: { in: statusList }
            }
          }
        }
      }
    }
  }

  // ── Advanced Rules Builder ──────────────────────────────
  if (params.advanced_rules) {
    try {
      const advanced = JSON.parse(params.advanced_rules)
      const mode = advanced.mode || 'ayant'
      const rules = advanced.rules || []

      const ruleClauses: any[] = []

      for (const rule of rules) {
        const { dataType, property, operator, value } = rule
        let clause: any = {}

        if (dataType === 'contacts') {
          clause = buildContactRule(property, operator, value)
        } else if (dataType === 'tasks') {
          clause = {
            links: {
              some: {
                task: buildTaskRule(property, operator, value)
              }
            }
          }
        } else if (dataType === 'mailcases') {
          clause = {
            links: {
              some: {
                mailCase: buildMailRule(property, operator, value)
              }
            }
          }
        } else if (dataType === 'writtenquestions') {
          clause = {
            links: {
              some: {
                question: buildQuestionRule(property, operator, value)
              }
            }
          }
        }

        if (clause && Object.keys(clause).length > 0) {
          ruleClauses.push(clause)
        }
      }

      if (ruleClauses.length > 0) {
        const isOr = rules.some((r: any) => r.condition === 'OR')
        
        let combinedClause: any = {}
        if (isOr) {
          combinedClause = { OR: ruleClauses }
        } else {
          combinedClause = { AND: ruleClauses }
        }

        if (mode === 'sans') {
          andClauses.push({ NOT: combinedClause })
        } else {
          andClauses.push(combinedClause)
        }
      }
    } catch (e) {
      console.error('Error parsing advanced_rules:', e)
    }
  }

  if (andClauses.length > 0) where.AND = andClauses
  return where
}

function buildContactRule(property: string, operator: string, value: string) {
  if (property === 'tags' || property === 'tag') {
    if (operator === 'isEmpty') {
      return { tags: { none: {} } }
    } else if (operator === 'isNotEmpty') {
      return { tags: { some: {} } }
    } else if (operator === 'contains') {
      return { tags: { some: { tag: { name: { contains: value, mode: 'insensitive' } } } } }
    } else if (operator === 'notContains' || operator === 'not_contains') {
      return { tags: { none: { tag: { name: { contains: value, mode: 'insensitive' } } } } }
    } else if (operator === 'equals') {
      return { tags: { some: { tag: { name: { equals: value, mode: 'insensitive' } } } } }
    }
  }

  const clause: any = {}
  
  const booleanFields = ['noContact', 'isNpai', 'consentEmail', 'consentPhone', 'consentSms', 'consentPostal', 'consentCustom']
  let parsedValue: any = value
  if (booleanFields.includes(property)) {
    parsedValue = value === 'true' || value === '1' || value === 'oui' || value === 'Oui' || value === 'true-boolean'
  }

  if (operator === 'isEmpty') {
    clause[property] = null
  } else if (operator === 'isNotEmpty') {
    clause[property] = { not: null }
  } else if (operator === 'contains') {
    clause[property] = { contains: value, mode: 'insensitive' }
  } else if (operator === 'notContains' || operator === 'not_contains') {
    clause[property] = { not: { contains: value, mode: 'insensitive' } }
  } else if (operator === 'equals') {
    clause[property] = { equals: parsedValue }
  } else if (operator === 'gte') {
    clause[property] = { gte: parsedValue }
  } else if (operator === 'lte') {
    clause[property] = { lte: parsedValue }
  }
  return clause
}

function buildTaskRule(property: string, operator: string, value: string) {
  const clause: any = {}
  if (operator === 'isEmpty') {
    clause[property] = null
  } else if (operator === 'isNotEmpty') {
    clause[property] = { not: null }
  } else if (operator === 'contains') {
    clause[property] = { contains: value, mode: 'insensitive' }
  } else if (operator === 'equals') {
    clause[property] = { equals: value }
  }
  return clause
}

function buildMailRule(property: string, operator: string, value: string) {
  const clause: any = {}
  if (operator === 'isEmpty') {
    clause[property] = null
  } else if (operator === 'isNotEmpty') {
    clause[property] = { not: null }
  } else if (operator === 'contains') {
    clause[property] = { contains: value, mode: 'insensitive' }
  } else if (operator === 'equals') {
    clause[property] = { equals: value }
  }
  return clause
}

function buildQuestionRule(property: string, operator: string, value: string) {
  const clause: any = {}
  if (operator === 'isEmpty') {
    clause[property] = null
  } else if (operator === 'isNotEmpty') {
    clause[property] = { not: null }
  } else if (operator === 'contains') {
    clause[property] = { contains: value, mode: 'insensitive' }
  } else if (operator === 'equals') {
    clause[property] = { equals: value }
  }
  return clause
}

