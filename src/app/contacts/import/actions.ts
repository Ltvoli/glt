'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Helpers ────────────────────────────────────────────────

/**
 * Lit une colonne du CSV en essayant plusieurs variantes de noms.
 * Gère les espaces parasites, la casse, et les accents.
 */
function col(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    // Essai exact
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key].trim()
    // Essai insensible à la casse
    const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase())
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return row[found].trim()
  }
  return ''
}

/**
 * Convertit CIVILITE Qomon → gender interne.
 * "M."/"M" → "H"  |  "Mme"/"MME" → "F"  |  reste → null
 */
function parseGender(civilite: string): string | null {
  const c = civilite.trim().toLowerCase()
  if (c === 'm.' || c === 'm') return 'H'
  if (c === 'mme' || c === 'mme.') return 'F'
  return null
}

/**
 * Parse une date en plusieurs formats courants (DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
function parseDate(raw: string): Date | null {
  if (!raw) return null

  // Si c'est un nombre pur de 5 chiffres (format date série Excel, ex: 31864)
  if (/^\d{5}$/.test(raw.trim())) {
    const num = parseInt(raw.trim())
    const d = new Date((num - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d
  }

  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`)
    return isNaN(d.getTime()) ? null : d
  }

  // Éviter de parser des années simples en futur lointain (ex: "2026")
  if (/^\d{4}$/.test(raw.trim())) {
    return null
  }

  // ISO YYYY-MM-DD
  const iso = new Date(raw)
  return isNaN(iso.getTime()) ? null : iso
}

/**
 * Extrait le numéro de rue et le nom de rue depuis "9 AVENUE MATHIAS DUVA…"
 * Retourne { streetNumber, streetName }
 */
function parseAddress(adresse: string): { streetNumber: string | null; streetName: string | null } {
  if (!adresse) return { streetNumber: null, streetName: null }
  const match = adresse.match(/^(\d+[\s\w]*?)\s+(.+)$/)
  if (match) {
    return { streetNumber: match[1].trim(), streetName: match[2].trim() }
  }
  return { streetNumber: null, streetName: adresse }
}

/**
 * Mappe la valeur "Niveau de Soutien" Qomon vers le label BDD correspondant.
 * Les niveaux BDD sont chargés dynamiquement (admin → Niveaux de soutien).
 *
 * Qomon utilise : "Très favorable", "Favorable", "Neutre", "Défavorable",
 *                 "Très défavorable" (ou chiffres 1-5).
 */
function parseSupportLevel(raw: string, dbLevels: { label: string; order: number }[]): string | null {
  if (!raw) return null
  const r = raw.trim()
  if (!r) return null

  const sorted = [...dbLevels].sort((a, b) => a.order - b.order) // du plus faible au plus fort
  const n = sorted.length
  if (n === 0) return r // pas de niveaux configurés → stocker brut

  // 1. Correspondance exacte (insensible à la casse)
  const exact = sorted.find(l => l.label.toLowerCase() === r.toLowerCase())
  if (exact) return exact.label

  const rLow = r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 2. Chiffres Qomon (1 = le plus faible, 5 = le plus fort)
  const num = parseInt(r)
  if (!isNaN(num) && num >= 1 && num <= 5) {
    const idx = Math.round(((num - 1) / 4) * (n - 1))
    return sorted[Math.min(idx, n - 1)].label
  }

  // 3. Mapping sémantique
  if (['tres defavorable', 'hostile', 'opposant'].some(v => rLow.includes(v))) return sorted[0].label
  if (['defavorable', 'reticent'].some(v => rLow.includes(v)) && !rLow.includes('tres')) return sorted[Math.max(0, Math.floor(n * 0.25))].label
  if (['neutre', 'indecis', 'sans opinion'].some(v => rLow.includes(v)))                  return sorted[Math.round((n - 1) / 2)].label
  if (['tres favorable', 'militant', 'engage'].some(v => rLow.includes(v)))               return sorted[n - 1].label
  if (['favorable', 'sympathisant'].some(v => rLow.includes(v)))                           return sorted[Math.min(n - 1, Math.round(n * 0.65))].label

  return r // valeur inconnue → stocker brut
}

// ─── Action principale ───────────────────────────────────────

async function importRows(rows: Record<string, string>[], file: File, forceConsent: boolean, userId: string): Promise<any> {
  let created     = 0
  let updated     = 0
  let duplicates  = 0
  let errorsCount = 0

  // ── Charger les niveaux de soutien configurés en BDD ──
  const dbSupportLevels = await prisma.supportLevel.findMany({ select: { label: true, order: true } })

  // ── Debug : log colonnes du premier enregistrement ──
  if (rows.length > 0) {
    console.log('[Qomon Import] Colonnes détectées :', Object.keys(rows[0]))
    console.log('[Qomon Import] Niveaux de soutien BDD :', dbSupportLevels.map(l => l.label))
  }

  // ── Optimisation : Pré-chargement des contacts existants pour rapprochement en mémoire ──
  const firstNames = Array.from(new Set(rows.map(r => col(r, 'PRENOM', 'Prénom', 'prenom', 'first_name')).filter(Boolean)))
  const lastNames = Array.from(new Set(rows.map(r => col(r, 'NOM', 'Nom', 'nom', 'last_name')).filter(Boolean)))

  // Pour maximiser les correspondances insensibles à la casse sans trop charger en mémoire,
  // on génère des variations de casse pour la recherche `in`
  const searchLastNames = new Set<string>()
  for (const name of lastNames) {
    searchLastNames.add(name)
    searchLastNames.add(name.toLowerCase())
    searchLastNames.add(name.toUpperCase())
    searchLastNames.add(name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
  }

  const existingContactsList = await prisma.contact.findMany({
    where: {
      archivedAt: null,
      lastName: { in: Array.from(searchLastNames) }
    }
  })

  // Indexation par prenom_nom (en minuscules) pour recherche rapide O(1)
  const contactsMap = new Map<string, typeof existingContactsList>()
  for (const c of existingContactsList) {
    const key = `${c.firstName.toLowerCase()}_${c.lastName.toLowerCase()}`
    if (!contactsMap.has(key)) {
      contactsMap.set(key, [])
    }
    contactsMap.get(key)!.push(c)
  }

  // ── Optimisation : Pré-chargement et création en masse des tags ──
  const allTagNames = new Set<string>()
  for (const row of rows) {
    const tagsRaw = col(row, 'Tags', 'TAGS', 'tags', 'mots_cles', 'mots clés', 'Mots clés')
    if (tagsRaw) {
      tagsRaw.split(/[,;|]/).forEach(t => {
        const trimmed = t.trim()
        if (trimmed) allTagNames.add(trimmed)
      })
    }
  }

  const existingTagsList = await prisma.tag.findMany({
    where: { name: { in: Array.from(allTagNames) } }
  })
  const tagsMap = new Map(existingTagsList.map(t => [t.name.toLowerCase(), t]))

  // Création des tags manquants
  for (const tagName of allTagNames) {
    if (!tagsMap.has(tagName.toLowerCase())) {
      try {
        const newTag = await prisma.tag.create({
          data: { name: tagName, color: '#6366f1' }
        })
        tagsMap.set(tagName.toLowerCase(), newTag)
      } catch (err) {
        // En cas de conflit de concurrence, on recharge le tag
        const refetched = await prisma.tag.findUnique({ where: { name: tagName } })
        if (refetched) tagsMap.set(tagName.toLowerCase(), refetched)
      }
    }
  }

  // Liste pour accumuler toutes les relations contact-tag à insérer en bloc à la fin
  const contactTagsToInsert: { contactId: string; tagId: string }[] = []

  for (const row of rows) {
    // ── Lecture des champs Qomon ─────────────────────
    const civilite   = col(row, 'CIVILITE', 'Civilité', 'civilite')
    const firstName  = col(row, 'PRENOM',   'Prénom',   'prenom',    'first_name')
    const lastName   = col(row, 'NOM',      'Nom',      'nom',       'last_name')
    const email      = col(row, 'EMAIL',    'Email',    'email')
    const phone      = col(row, 'TELEPHONE','Téléphone','Telephone', 'telephone', 'TÉLÉPHONE')
    const mobile     = col(row, 'PORTABLE', 'Portable', 'portable',  'Mobile',    'MOBILE')
    const birthRaw   = col(row, 'DATE DE NAISSANCE', 'Date de naissance', 'DATE_NAISSANCE', 'birthdate', 'date_naissance')
    const adresse1   = col(row, 'ADRESSE 1', 'ADRESSE1', 'Adresse 1', 'Adresse1', 'adresse1', 'Adresse', 'adresse')
    const adresse2   = col(row, 'ADRESSE 2', 'ADRESSE2', 'Adresse 2', 'Adresse2', 'adresse2')
    const postalCode = col(row, 'CODE POSTAL', 'Code postal', 'code_postal', 'CP', 'cp', 'zip')
    const city       = col(row, 'COMMUNE',  'Ville',    'commune',   'Ville',     'city')
    const profession = col(row, 'PROFESSION','profession', 'Profession')
    const tagsRaw    = col(row, 'Tags', 'TAGS', 'tags', 'mots_cles', 'mots clés', 'Mots clés')
    const newsletter = col(row, 'Newsletter','newsletter','NEWSLETTER')
    const notes      = col(row, 'Notes',     'NOTES',    'notes')
    const supportRaw = col(row, 'Niveau de Soutien', 'NIVEAU DE SOUTIEN', 'niveau_soutien', 'support_level')
    const supportLevel = parseSupportLevel(supportRaw, dbSupportLevels)

    // ── Validation minimale ──────────────────────────
    if (!firstName || !lastName) {
      errorsCount++
      continue
    }

    // ── Transformations ──────────────────────────────
    const gender    = parseGender(civilite) || null
    const birthDate = parseDate(birthRaw)
    const { streetNumber, streetName } = parseAddress(adresse1)

    // ADRESSE 2 → address complement (stocké dans notes si pas de champ dédié)
    const fullNotes = [
      notes,
      adresse2 ? `Complément d'adresse : ${adresse2}` : '',
    ].filter(Boolean).join('\n') || null

    let consentEmail: boolean | null = null
    let consentDate = null
    let consentSource = null

    if (forceConsent) {
      consentEmail = true
      consentDate = new Date()
      consentSource = 'IMPORT_MASSE'
    } else if (newsletter) {
      const isYes = (newsletter.toLowerCase() === 'oui' || newsletter.toLowerCase() === 'true' || newsletter === '1')
      consentEmail = isYes ? true : false
    }

    // ── Données à insérer ────────────────────────────
    const dataToInsert = {
      firstName,
      lastName,
      email:        email    || null,
      phone:        phone    || null,
      mobilePhone:  mobile   || null,
      streetNumber: streetNumber,
      streetName:   streetName,
      postalCode:   postalCode || null,
      city:         city       || null,
      gender,
      birthDate,
      supportLevel: supportLevel || null,
      notes:        fullNotes,
      profession:   profession || null,
      consentEmail: consentEmail,
      consentDate:  consentDate,
      consentSource: consentSource,
      type:         'ELECTEUR' as const,
      createdById:  userId,
    }

    let insertedContact: any = null
    let existingContact: any = null

    const lookupKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`
    const candidateMatches = contactsMap.get(lookupKey) || []

    if (email) {
      existingContact = candidateMatches.find(m => m.email && m.email.toLowerCase() === email.toLowerCase())
    }
    if (!existingContact && (mobile || phone)) {
      existingContact = candidateMatches.find(m => {
        const matchMobile = mobile && m.mobilePhone === mobile
        const matchPhone = phone && m.phone === phone
        return matchMobile || matchPhone
      })
    }

    try {
      if (existingContact) {
        // Fusionner les notes
        let mergedNotes = existingContact.notes
        if (fullNotes) {
          if (mergedNotes) {
            if (!mergedNotes.includes(fullNotes)) {
              mergedNotes = `${mergedNotes}\n\n[Import] ${fullNotes}`
            }
          } else {
            mergedNotes = fullNotes
          }
        }

        // Mettre à jour le contact existant
        insertedContact = await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            notes: mergedNotes,
            supportLevel: supportLevel || existingContact.supportLevel,
            // Renseigne uniquement les champs vides
            email: existingContact.email || email || null,
            phone: existingContact.phone || phone || null,
            mobilePhone: existingContact.mobilePhone || mobile || null,
            streetNumber: existingContact.streetNumber || streetNumber,
            streetName: existingContact.streetName || streetName,
            postalCode: existingContact.postalCode || postalCode || null,
            city: existingContact.city || city || null,
            profession: existingContact.profession || profession || null,
            gender: existingContact.gender || gender,
            birthDate: existingContact.birthDate || birthDate,
          }
        })

        // Mettre à jour la fiche en mémoire pour d'éventuels doublons successifs dans le fichier
        const idx = candidateMatches.findIndex(m => m.id === existingContact.id)
        if (idx !== -1) {
          candidateMatches[idx] = insertedContact
        }

        updated++
      } else {
        // Créer un nouveau contact
        insertedContact = await prisma.contact.create({ data: dataToInsert })
        created++

        // Ajouter à la liste mémoire pour les suivantes lignes
        candidateMatches.push(insertedContact)
        contactsMap.set(lookupKey, candidateMatches)
      }
    } catch (err: any) {
      console.error('[Qomon Import] Erreur insertion/mise à jour :', lastName, firstName, err?.message)
      errorsCount++
      continue
    }

    // ── Accumuler les relations de tags ──
    if (insertedContact && tagsRaw) {
      const tagNames = tagsRaw
        .split(/[,;|]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0)

      for (const tagName of tagNames) {
        const tag = tagsMap.get(tagName.toLowerCase())
        if (tag) {
          contactTagsToInsert.push({ contactId: insertedContact.id, tagId: tag.id })
        }
      }
    }
  }

  // ── Insertion en bloc de toutes les relations contact-tag ──
  if (contactTagsToInsert.length > 0) {
    try {
      await prisma.contactTag.createMany({
        data: contactTagsToInsert,
        skipDuplicates: true
      })
    } catch (err) {
      console.error('[Qomon Import] Erreur insertion relations tags :', err)
    }
  }

  // ── Détection des doublons en Batch (SQL avec pg_trgm) ──
  try {
    const emailDups = await prisma.$executeRawUnsafe(`
      INSERT INTO "DuplicateCandidate" ("id", "contact1Id", "contact2Id", "reason", "status", "createdAt")
      SELECT 
        'dup_' || substring(md5(random()::text) from 1 for 12),
        c1.id,
        c2.id,
        'NOM_EMAIL',
        'PENDING',
        NOW()
      FROM "Contact" c1
      JOIN "Contact" c2 ON c1.id < c2.id
      WHERE c1."archivedAt" IS NULL 
        AND c2."archivedAt" IS NULL
        AND c1.email IS NOT NULL AND c1.email <> '' AND c1.email = c2.email
        AND similarity(c1."lastName", c2."lastName") > 0.6
        AND NOT EXISTS (
          SELECT 1 FROM "DuplicateCandidate" dc 
          WHERE (dc."contact1Id" = c1.id AND dc."contact2Id" = c2.id)
             OR (dc."contact1Id" = c2.id AND dc."contact2Id" = c1.id)
        );
    `)
    const phoneDups = await prisma.$executeRawUnsafe(`
      INSERT INTO "DuplicateCandidate" ("id", "contact1Id", "contact2Id", "reason", "status", "createdAt")
      SELECT 
        'dup_' || substring(md5(random()::text) from 1 for 12),
        c1.id,
        c2.id,
        'NOM_PHONE',
        'PENDING',
        NOW()
      FROM "Contact" c1
      JOIN "Contact" c2 ON c1.id < c2.id
      WHERE c1."archivedAt" IS NULL 
        AND c2."archivedAt" IS NULL
        AND (
          (c1.phone IS NOT NULL AND c1.phone <> '' AND c1.phone = c2.phone)
          OR (c1."mobilePhone" IS NOT NULL AND c1."mobilePhone" <> '' AND c1."mobilePhone" = c2."mobilePhone")
        )
        AND similarity(c1."lastName", c2."lastName") > 0.6
        AND NOT EXISTS (
          SELECT 1 FROM "DuplicateCandidate" dc 
          WHERE (dc."contact1Id" = c1.id AND dc."contact2Id" = c2.id)
             OR (dc."contact1Id" = c2.id AND dc."contact2Id" = c1.id)
        );
    `)
    const nameDups = await prisma.$executeRawUnsafe(`
      INSERT INTO "DuplicateCandidate" ("id", "contact1Id", "contact2Id", "reason", "status", "createdAt")
      SELECT 
        'dup_' || substring(md5(random()::text) from 1 for 12),
        c1.id,
        c2.id,
        'NOM_SIMILAIRE',
        'PENDING',
        NOW()
      FROM "Contact" c1
      JOIN "Contact" c2 ON c1.id < c2.id
      WHERE c1."archivedAt" IS NULL 
        AND c2."archivedAt" IS NULL
        AND similarity(c1."firstName" || ' ' || c1."lastName", c2."firstName" || ' ' || c2."lastName") > 0.85
        AND NOT EXISTS (
          SELECT 1 FROM "DuplicateCandidate" dc 
          WHERE (dc."contact1Id" = c1.id AND dc."contact2Id" = c2.id)
             OR (dc."contact1Id" = c2.id AND dc."contact2Id" = c1.id)
        );
    `)
    duplicates = Number(emailDups) + Number(phoneDups) + Number(nameDups)
  } catch (trgmErr) {
    console.error('[Qomon Import] Erreur détection doublons batch:', trgmErr)
  }

  // ── Log import ───────────────────────────────────
  try {
    await prisma.importLog.create({
      data: {
        filename:     file.name,
        status:       errorsCount > 0 && created === 0 ? 'ERROR' : 'SUCCESS',
        rowsImported: created + updated + duplicates,
        userId:       userId,
      }
    })
  } catch { /* importLog non critique */ }

  console.log(`[Qomon Import] Résultat → créés: ${created}, mis à jour: ${updated}, doublons: ${duplicates}, erreurs: ${errorsCount}`)

  return { created, updated, duplicates, errors: errorsCount }
}

export async function processImport(formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const file = formData.get('file') as File
  if (!file) return { error: 'Aucun fichier fourni' }

  const forceConsent = formData.get('forceConsent') === 'true'

  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

      const rows = rawRows.map(r => {
        const stringRow: Record<string, string> = {}
        for (const [k, v] of Object.entries(r)) {
          const cleanKey = k.replace(/^\uFEFF/, '').trim()
          stringRow[cleanKey] = v !== null && v !== undefined ? String(v).trim() : ''
        }
        return stringRow
      })

      return await importRows(rows, file, forceConsent, session.userId)
    } catch (excelErr: any) {
      console.error('[Qomon Import] Erreur lecture Excel :', excelErr)
      return { error: 'Erreur lors de la lecture du fichier Excel.' }
    }
  }

  // ── Détection d'encodage pour CSV ────────────────────────
  const buffer = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer)
  }

  return new Promise<any>((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.replace(/^\uFEFF/, '').trim(),

      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const outcome = await importRows(rows, file, forceConsent, session.userId)
        resolve(outcome)
      },

      error: (err: any) => {
        console.error('[Qomon Import] Parsing error:', err)
        resolve({ error: 'Erreur lors de la lecture du fichier CSV. Vérifiez l\'encodage (UTF-8).' })
      }
    })
  })
}
