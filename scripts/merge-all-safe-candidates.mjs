import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fusionnerContacts(keepId, deleteId, candidateId) {
  // 1. Transférer / dédupliquer les GlobalLinks en SQL direct
  await prisma.$executeRawUnsafe(`
    UPDATE "GlobalLink" gl
    SET "contactId" = $1
    WHERE gl."contactId" = $2
      AND NOT EXISTS (
        SELECT 1 FROM "GlobalLink" target
        WHERE target."contactId" = $1
          AND target."taskId" IS NOT DISTINCT FROM gl."taskId"
          AND target."mailCaseId" IS NOT DISTINCT FROM gl."mailCaseId"
          AND target."questionId" IS NOT DISTINCT FROM gl."questionId"
      );
  `, keepId, deleteId)

  await prisma.$executeRawUnsafe(`
    DELETE FROM "GlobalLink" WHERE "contactId" = $1;
  `, deleteId)

  // 2. Transférer les ContactTags avec ON CONFLICT DO NOTHING
  await prisma.$executeRawUnsafe(`
    INSERT INTO "ContactTag" ("contactId", "tagId")
    SELECT $1, "tagId"
    FROM "ContactTag"
    WHERE "contactId" = $2
    ON CONFLICT ("contactId", "tagId") DO NOTHING;
  `, keepId, deleteId)

  await prisma.$executeRawUnsafe(`
    DELETE FROM "ContactTag" WHERE "contactId" = $1;
  `, deleteId)

  // 3. Supprimer tous les candidats doublons impliquant le contact supprimé
  await prisma.$executeRawUnsafe(`
    DELETE FROM "DuplicateCandidate"
    WHERE "contact1Id" = $1 OR "contact2Id" = $1;
  `, deleteId)

  // 4. Marquer le candidat comme résolu
  if (candidateId && candidateId !== 'manual') {
    await prisma.$executeRawUnsafe(`
      UPDATE "DuplicateCandidate"
      SET "status" = 'RESOLVED'
      WHERE "id" = $1;
    `, candidateId)
  }

  // 5. Archiver le contact doublon
  await prisma.contact.update({
    where: { id: deleteId },
    data: { archivedAt: new Date() }
  })
}

async function main() {
  console.log('=== FUSION AUTOMATIQUE DES 2 901 DOUBLONS POTENTIELS SANS CONFLIT ===')

  const candidates = await prisma.duplicateCandidate.findMany({
    where: { status: 'PENDING' },
    include: {
      contact1: true,
      contact2: true,
    }
  })

  console.log(`Nombre total de candidats à examiner : ${candidates.length}`)

  let mergedCount = 0
  let skippedCount = 0

  for (const candidate of candidates) {
    const { contact1: c1, contact2: c2 } = candidate

    if (!c1 || !c2) {
      await prisma.duplicateCandidate.update({
        where: { id: candidate.id },
        data: { status: 'RESOLVED' }
      })
      continue
    }

    if (c1.archivedAt || c2.archivedAt) {
      await prisma.duplicateCandidate.update({
        where: { id: candidate.id },
        data: { status: 'RESOLVED' }
      })
      continue
    }

    const email1 = c1.email?.trim().toLowerCase() || null
    const email2 = c2.email?.trim().toLowerCase() || null
    const phone1 = (c1.mobilePhone || c1.phone)?.trim().replace(/[\s.-]+/g, '') || null
    const phone2 = (c2.mobilePhone || c2.phone)?.trim().replace(/[\s.-]+/g, '') || null

    const emailConflict = email1 && email2 && email1 !== email2
    const phoneConflict = phone1 && phone2 && phone1 !== phone2

    // Si conflit d'email ou de téléphone, ne pas fusionner automatiquement
    if (emailConflict || phoneConflict) {
      skippedCount++
      continue
    }

    // Déterminer la fiche principale (la mieux renseignée)
    const scoreContact = (c) => {
      let score = 0
      if (c.email) score += 10
      if (c.mobilePhone || c.phone) score += 10
      if (c.usageName) score += 5
      if (c.city || c.postalCode) score += 5
      if (c.birthDate) score += 5
      if (c.notes) score += 2
      return score
    }

    const score1 = scoreContact(c1)
    const score2 = scoreContact(c2)

    let keep = c1
    let del = c2

    if (score2 > score1 || (score2 === score1 && c2.createdAt < c1.createdAt)) {
      keep = c2
      del = c1
    }

    try {
      // Compléter les champs manquants du contact conservé depuis le doublon
      const updateData = {}
      const fieldsToFill = [
        'email', 'usageName', 'mobilePhone', 'phone', 'streetNumber', 'streetName',
        'postalCode', 'city', 'gender', 'birthDate', 'type', 'supportLevel',
        'notes', 'profession', 'consentEmail', 'consentPhone', 'consentSms',
        'consentPostal', 'consentCustom'
      ]

      for (const field of fieldsToFill) {
        if (!keep[field] && del[field]) {
          updateData[field] = del[field]
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.contact.update({
          where: { id: keep.id },
          data: updateData
        })
      }

      await fusionnerContacts(keep.id, del.id, candidate.id)
      mergedCount++

      if (mergedCount % 100 === 0) {
        console.log(`[PROGRESSION] ${mergedCount} / ${candidates.length} doublons fusionnés avec succès...`)
      }
    } catch (err) {
      console.error(`Erreur fusion candidat ${candidate.id}:`, err.message)
    }
  }

  console.log(`\n🎉 FUSION AUTOMATIQUE DES CANDIDATS TERMINÉE !`)
  console.log(`- Fusionnés avec succès : ${mergedCount}`)
  console.log(`- Ignorés (vrais conflits nécessitant arbitrage) : ${skippedCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
