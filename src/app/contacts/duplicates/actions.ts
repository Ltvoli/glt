'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { redirect } from 'next/navigation'


// ─── Ignorer un doublon (pas un vrai doublon) ────────────────
export async function dismissDuplicate(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const candidateId = formData.get('candidateId') as string
  if (!candidateId) return { error: 'ID introuvable' }

  try {
    await prisma.duplicateCandidate.update({
      where: { id: candidateId },
      data: { status: 'RESOLVED' }
    })
    revalidatePath('/contacts/duplicates')
    return { success: true }
  } catch (e) {
    return { error: 'Erreur lors de la mise à jour.' }
  }
}

// ─── Fusion simple (garder un contact, archiver l'autre) ─────
export async function mergeDuplicate(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const candidateId     = formData.get('candidateId')     as string
  const keepContactId   = formData.get('keepContactId')   as string
  const deleteContactId = formData.get('deleteContactId') as string

  if (!candidateId || !keepContactId || !deleteContactId) return { error: 'Données manquantes' }

  try {
    await fusionnerContacts(keepContactId, deleteContactId, candidateId, session.userId)
    revalidatePath('/contacts/duplicates')
    revalidatePath('/contacts')
  } catch (e: any) {
    console.error('[mergeDuplicate]', e)
    return { error: `Erreur technique : ${e?.message ?? 'inconnue'}` }
  }

  redirect('/contacts/duplicates')
}

// ─── Fusion avancée (champ par champ depuis le formulaire) ───
export async function advancedMergeDuplicate(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const candidateId     = formData.get('candidateId')     as string
  const keepContactId   = formData.get('keepContactId')   as string
  const deleteContactId = formData.get('deleteContactId') as string

  if (!candidateId || !keepContactId || !deleteContactId) return { error: 'Données manquantes' }

  // Construire le payload depuis les champs sélectionnés
  const FIELDS = [
    'firstName','lastName','email','mobilePhone','phone',
    'streetNumber','streetName','postalCode','city',
    'gender','birthDate','type','supportLevel',
    'notes','profession','consentEmail','consentPhone',
    'consentSms','consentPostal','consentCustom','noContact',
  ]

  const dataToUpdate: Record<string, any> = {}
  for (const field of FIELDS) {
    const val = formData.get(`field_${field}`)
    if (val !== null && val !== undefined) {
      dataToUpdate[field] = val === '' ? null : val
    }
  }

  // Traitement spécial pour les champs date
  if (dataToUpdate.birthDate && typeof dataToUpdate.birthDate === 'string') {
    const d = new Date(dataToUpdate.birthDate)
    dataToUpdate.birthDate = isNaN(d.getTime()) ? null : d
  }

  // Traitement des consentements (trois états)
  for (const f of ['consentEmail', 'consentPhone', 'consentSms', 'consentPostal', 'consentCustom']) {
    if (dataToUpdate[f] !== undefined && dataToUpdate[f] !== null) {
      dataToUpdate[f] = dataToUpdate[f] === 'true' ? true : dataToUpdate[f] === 'false' ? false : null
    }
  }

  // Traitement du booléen noContact
  if (dataToUpdate.noContact !== undefined && dataToUpdate.noContact !== null) {
    dataToUpdate.noContact = dataToUpdate.noContact === 'true'
  }

  try {
    // Mettre à jour les champs sélectionnés sur le contact conservé
    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.contact.update({
        where: { id: keepContactId },
        data: dataToUpdate,
      })
    }

    await fusionnerContacts(keepContactId, deleteContactId, candidateId, session.userId)
    revalidatePath('/contacts/duplicates')
    revalidatePath('/contacts')
  } catch (e: any) {
    console.error('[mergeAdvancedDuplicate]', e)
    return { error: `Erreur technique : ${e?.message ?? 'inconnue'}` }
  }

  redirect('/contacts/duplicates')
}

// ═══════════════════════════════════════════════════════════════
// Logique de fusion : transfère TOUTES les relations du contact
// supprimé vers le contact conservé, puis l'archive.
//
// Structure réelle du schéma :
//   - Les liens tâches/courriers/QE ↔ contacts passent par GlobalLink
//     (globalLink.contactId, globalLink.taskId | mailCaseId | questionId)
//   - Les tags contacts passent par ContactTag (@@id([contactId, tagId]))
// ═══════════════════════════════════════════════════════════════
async function fusionnerContacts(
  keepId: string,
  deleteId: string,
  candidateId: string,
  userId: string,
) {
  await prisma.$transaction(async (tx) => {

    // 1. Récupérer tous les GlobalLinks du contact à supprimer
    const linksToTransfer = await tx.globalLink.findMany({
      where: { contactId: deleteId }
    })

    for (const link of linksToTransfer) {
      // Vérifier s'il existe déjà un lien identique pour le contact conservé
      const duplicate = await tx.globalLink.findFirst({
        where: {
          contactId: keepId,
          taskId:    link.taskId    ?? undefined,
          mailCaseId: link.mailCaseId ?? undefined,
          questionId: link.questionId ?? undefined,
        }
      })

      if (!duplicate) {
        // Réaffecter le lien au contact conservé
        await tx.globalLink.update({
          where: { id: link.id },
          data: { contactId: keepId }
        })
      } else {
        // Doublon de lien → supprimer
        await tx.globalLink.delete({ where: { id: link.id } })
      }
    }

    // 2. Transférer les tags (ContactTag a une clé composite [contactId, tagId])
    const tagsToTransfer = await tx.contactTag.findMany({
      where: { contactId: deleteId }
    })

    for (const ct of tagsToTransfer) {
      // Vérifier si le tag existe déjà sur le contact conservé
      const existing = await tx.contactTag.findUnique({
        where: { contactId_tagId: { contactId: keepId, tagId: ct.tagId } }
      })
      if (!existing) {
        // Créer le tag sur le contact conservé
        await tx.contactTag.create({
          data: { contactId: keepId, tagId: ct.tagId }
        })
      }
      // Supprimer le tag de l'ancien contact
      await tx.contactTag.delete({
        where: { contactId_tagId: { contactId: deleteId, tagId: ct.tagId } }
      })
    }

    // 3. Supprimer les autres candidats doublons impliquant le contact supprimé
    await tx.duplicateCandidate.deleteMany({
      where: {
        id: { not: candidateId },
        OR: [
          { contact1Id: deleteId },
          { contact2Id: deleteId },
        ]
      }
    })

    // 4. Résoudre le candidat courant s'il existe
    if (candidateId && candidateId !== 'manual') {
      const exists = await tx.duplicateCandidate.findUnique({
        where: { id: candidateId }
      })
      if (exists) {
        await tx.duplicateCandidate.update({
          where: { id: candidateId },
          data: { status: 'RESOLVED' }
        })
      }
    }

    // 5. Archiver le contact doublon
    await tx.contact.update({
      where: { id: deleteId },
      data: { archivedAt: new Date() }
    })
  })

  // 6. Log d'audit (hors transaction pour éviter les timeouts)
  await logAudit('DUPLICATE_MERGED', 'Contact', keepId, userId, {
    mergedContactId: deleteId,
    candidateId,
  })
}

// ──────────────────────────────────────────────────────────
// Détection des doublons en Batch (SQL avec pg_trgm)
// ──────────────────────────────────────────────────────────
export async function triggerDuplicateDetection() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  const allowedRoles = ['ADMINISTRATEUR', 'SUPERVISEUR', 'SUPERADMIN', 'ADMIN']
  const roleToCheck = session.dbRole || session.role
  if (!roleToCheck || !allowedRoles.includes(roleToCheck)) {
    throw new Error('Accès refusé.')
  }

  try {
    // Augmenter temporairement le timeout de la requête pour cette session (90 secondes)
    await prisma.$executeRawUnsafe('SET statement_timeout = 90000;')

    // 1. Détecter par email identique et nom similaire
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

    // 2. Détecter par téléphone identique (mobile ou fixe) et nom similaire
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

    // 3. Détecter par nom très similaire (prénom + nom > 0.85) sans autre info de contact identique
    // OPTIMISATION : on limite la comparaison aux contacts partageant les 2 premières lettres du nom de famille
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
        AND substring(c1."lastName" from 1 for 2) = substring(c2."lastName" from 1 for 2)
        AND similarity(c1."firstName" || ' ' || c1."lastName", c2."firstName" || ' ' || c2."lastName") > 0.85
        AND NOT EXISTS (
          SELECT 1 FROM "DuplicateCandidate" dc 
          WHERE (dc."contact1Id" = c1.id AND dc."contact2Id" = c2.id)
             OR (dc."contact1Id" = c2.id AND dc."contact2Id" = c1.id)
        );
    `)

    revalidatePath('/contacts/duplicates')
    revalidatePath('/contacts')
    return { success: true, count: Number(emailDups) + Number(phoneDups) + Number(nameDups) }
  } catch (error: any) {
    console.error('[triggerDuplicateDetection]', error)
    return { error: `Erreur : ${error?.message || 'impossible de lancer la détection'}` }
  }
}

export async function bulkMergeExactDuplicates() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  const allowedRoles = ['ADMINISTRATEUR', 'SUPERVISEUR', 'SUPERADMIN', 'ADMIN']
  const roleToCheck = session.dbRole || session.role
  if (!roleToCheck || !allowedRoles.includes(roleToCheck)) {
    throw new Error('Accès refusé.')
  }

  try {
    // 1. Trouver les groupes de doublons de noms/prénoms exacts (actifs)
    const duplicateGroups = await prisma.$queryRawUnsafe<{ fn: string; ln: string; count: number }[]>(`
      SELECT LOWER("firstName") as fn, LOWER("lastName") as ln, COUNT(*)::integer as count
      FROM "Contact"
      WHERE "archivedAt" IS NULL
      GROUP BY LOWER("firstName"), LOWER("lastName")
      HAVING COUNT(*) > 1
      LIMIT 1000;
    `)

    let mergedCount = 0

    // 2. Traiter chaque groupe
    for (const group of duplicateGroups) {
      const { fn, ln } = group

      // Récupérer tous les contacts correspondants
      const contacts = await prisma.contact.findMany({
        where: {
          firstName: { equals: fn, mode: 'insensitive' },
          lastName: { equals: ln, mode: 'insensitive' },
          archivedAt: null
        }
      })

      if (contacts.length <= 1) continue

      // Vérifier les conflits potentiels d'e-mail ou de téléphone
      const emails = new Set(contacts.map(c => c.email?.trim().toLowerCase()).filter(Boolean))
      const phones = new Set(
        contacts
          .map(c => (c.mobilePhone || c.phone)?.trim().replace(/[\s.-]+/g, ''))
          .filter(Boolean)
      )

      // S'il y a plus d'un e-mail différent ou plus d'un téléphone différent, on considère qu'il y a conflit
      if (emails.size > 1 || phones.size > 1) {
        continue
      }

      // Déterminer le contact à conserver (le mieux renseigné, ou à défaut le plus ancien)
      const scoreContact = (c: any) => {
        let score = 0
        if (c.email) score += 10
        if (c.mobilePhone || c.phone) score += 10
        if (c.city || c.postalCode) score += 5
        if (c.birthDate) score += 5
        if (c.notes) score += 2
        return score
      }

      const sorted = [...contacts].sort((a, b) => {
        const scoreA = scoreContact(a)
        const scoreB = scoreContact(b)
        if (scoreA !== scoreB) return scoreB - scoreA // plus grand score en premier
        return a.createdAt.getTime() - b.createdAt.getTime() // plus ancien en premier
      })

      const primary = sorted[0]
      const duplicates = sorted.slice(1)

      // Fusionner dans une transaction
      await prisma.$transaction(async (tx) => {
        for (const dup of duplicates) {
          // A. Transférer les GlobalLinks
          const links = await tx.globalLink.findMany({
            where: { contactId: dup.id }
          })

          for (const link of links) {
            const exists = await tx.globalLink.findFirst({
              where: {
                contactId: primary.id,
                taskId: link.taskId ?? undefined,
                mailCaseId: link.mailCaseId ?? undefined,
                questionId: link.questionId ?? undefined,
              }
            })

            if (!exists) {
              await tx.globalLink.update({
                where: { id: link.id },
                data: { contactId: primary.id }
              })
            } else {
              await tx.globalLink.delete({
                where: { id: link.id }
              })
            }
          }

          // B. Transférer les ContactTags
          const tags = await tx.contactTag.findMany({
            where: { contactId: dup.id }
          })

          for (const ct of tags) {
            const exists = await tx.contactTag.findUnique({
              where: {
                contactId_tagId: { contactId: primary.id, tagId: ct.tagId }
              }
            })

            if (!exists) {
              await tx.contactTag.create({
                data: { contactId: primary.id, tagId: ct.tagId }
              })
            }

            await tx.contactTag.delete({
              where: {
                contactId_tagId: { contactId: dup.id, tagId: ct.tagId }
              }
            })
          }

          // C. Compléter les champs manquants du contact primaire depuis le doublon
          const updateData: Record<string, any> = {}
          const fieldsToFill = [
            'email', 'mobilePhone', 'phone', 'streetNumber', 'streetName',
            'postalCode', 'city', 'gender', 'birthDate', 'type', 'supportLevel',
            'notes', 'profession', 'consentEmail', 'consentPhone', 'consentSms',
            'consentPostal', 'consentCustom'
          ] as const

          for (const field of fieldsToFill) {
            if (!primary[field] && dup[field]) {
              updateData[field] = dup[field]
            }
          }

          if (Object.keys(updateData).length > 0) {
            await tx.contact.update({
              where: { id: primary.id },
              data: updateData
            })
          }

          // D. Supprimer les candidats doublons impliquant le contact fusionné
          await tx.duplicateCandidate.deleteMany({
            where: {
              OR: [
                { contact1Id: dup.id },
                { contact2Id: dup.id }
              ]
            }
          })

          // E. Archiver le contact en doublon
          await tx.contact.update({
            where: { id: dup.id },
            data: { archivedAt: new Date() }
          })

          mergedCount++
        }
      })
    }

    revalidatePath('/contacts/duplicates')
    revalidatePath('/contacts')

    return { success: true, count: mergedCount }
  } catch (error: any) {
    console.error('[bulkMergeExactDuplicates]', error)
    return { error: `Erreur : ${error?.message || 'impossible de fusionner les doublons'}` }
  }
}

