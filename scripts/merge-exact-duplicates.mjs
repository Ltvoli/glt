import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fusionnerContacts(keepId, deleteId) {
  // 1. Transférer / dédupliquer les GlobalLinks en SQL direct (IS NOT DISTINCT FROM gère le NULL)
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

  // 4. Archiver le contact doublon
  await prisma.contact.update({
    where: { id: deleteId },
    data: { archivedAt: new Date() }
  })
}

async function runBatchMerge() {
  console.log('=== DÉBUT DE LA FUSION EN MASSE OPTIMISÉE (SQL ULTRA-RAPIDE) ===')
  let totalMerged = 0
  let batchCount = 0

  while (true) {
    batchCount++
    console.log(`\n--- Traitement du Lot #${batchCount} ---`)

    // 1. Trouver les groupes de doublons exacts (max 500 groupes par itération)
    const duplicateGroups = await prisma.$queryRaw`
      SELECT LOWER("firstName") as fn, LOWER(COALESCE(NULLIF("usageName", ''), "lastName")) as ln, COUNT(*)::integer as count
      FROM "Contact"
      WHERE "archivedAt" IS NULL
      GROUP BY LOWER("firstName"), LOWER(COALESCE(NULLIF("usageName", ''), "lastName"))
      HAVING COUNT(*) > 1
      LIMIT 500;
    `

    if (!duplicateGroups || duplicateGroups.length === 0) {
      console.log('✅ Aucun autre doublon de nom exact trouvé. Fusion terminée !')
      break
    }

    console.log(`Trouvé ${duplicateGroups.length} groupes de doublons dans ce lot.`)

    let batchMerged = 0

    for (const group of duplicateGroups) {
      const { fn, ln } = group
      if (!fn || !ln) continue

      // Récupérer tous les contacts de ce groupe
      const contacts = await prisma.contact.findMany({
        where: {
          firstName: { equals: fn, mode: 'insensitive' },
          OR: [
            { lastName: { equals: ln, mode: 'insensitive' } },
            { usageName: { equals: ln, mode: 'insensitive' } },
          ],
          archivedAt: null
        }
      })

      if (contacts.length <= 1) continue

      // S'il y a conflit sur l'email ou le téléphone (plusieurs emails/téléphones différents non vides), ignorer la fusion automatique pour éviter les faux positifs
      const emails = new Set(contacts.map(c => c.email?.trim().toLowerCase()).filter(Boolean))
      const phones = new Set(
        contacts
          .map(c => (c.mobilePhone || c.phone)?.trim().replace(/[\s.-]+/g, ''))
          .filter(Boolean)
      )

      if (emails.size > 1 || phones.size > 1) {
        continue
      }

      // Score pour conserver la fiche la plus complète
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

      const sorted = [...contacts].sort((a, b) => {
        const scoreA = scoreContact(a)
        const scoreB = scoreContact(b)
        if (scoreA !== scoreB) return scoreB - scoreA
        return a.createdAt.getTime() - b.createdAt.getTime()
      })

      const primary = sorted[0]
      const duplicates = sorted.slice(1)

      for (const dup of duplicates) {
        try {
          // Compléter les champs manquants du contact primaire depuis le doublon (y compris usageName)
          const updateData = {}
          const fieldsToFill = [
            'email', 'usageName', 'mobilePhone', 'phone', 'streetNumber', 'streetName',
            'postalCode', 'city', 'gender', 'birthDate', 'type', 'supportLevel',
            'notes', 'profession', 'consentEmail', 'consentPhone', 'consentSms',
            'consentPostal', 'consentCustom'
          ]

          for (const field of fieldsToFill) {
            if (!primary[field] && dup[field]) {
              updateData[field] = dup[field]
              primary[field] = dup[field]
            }
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.contact.update({
              where: { id: primary.id },
              data: updateData
            })
          }

          // Fusionner via fusionnerContacts
          await fusionnerContacts(primary.id, dup.id)
          batchMerged++
          totalMerged++
        } catch (dupError) {
          console.error(`Erreur fusion ${fn} ${ln} (ID: ${dup.id}):`, dupError.message)
        }
      }
    }

    console.log(`Lot #${batchCount} terminé : ${batchMerged} doublons fusionnés. (Total cumulé: ${totalMerged})`)

    if (batchMerged === 0) {
      console.log('Aucun autre doublon fusionnable automatiquement sans conflit dans ce lot.')
      break
    }
  }

  console.log(`\n🎉 FUSION EN MASSE TERMINÉE AVEC SUCCÈS AU TOTAL : ${totalMerged} doublons fusionnés !`)
}

runBatchMerge()
  .catch(e => console.error('Erreur fatale:', e))
  .finally(() => prisma.$disconnect())
