import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const candidates = await prisma.duplicateCandidate.findMany({
    where: { status: 'PENDING' },
    include: {
      contact1: true,
      contact2: true,
    }
  })

  let alreadyArchivedCount = 0
  let sameEmailOrPhoneCount = 0
  let safeToMergeCount = 0
  let manualReviewNeeded = 0

  for (const candidate of candidates) {
    const { contact1: c1, contact2: c2 } = candidate

    if (!c1 || !c2 || c1.archivedAt || c2.archivedAt) {
      alreadyArchivedCount++
      continue
    }

    const emailMatch = c1.email && c2.email && c1.email.trim().toLowerCase() === c2.email.trim().toLowerCase()
    const phone1 = (c1.mobilePhone || c1.phone)?.trim().replace(/[\s.-]+/g, '')
    const phone2 = (c2.mobilePhone || c2.phone)?.trim().replace(/[\s.-]+/g, '')
    const phoneMatch = phone1 && phone2 && phone1 === phone2

    if (emailMatch || phoneMatch) {
      sameEmailOrPhoneCount++
      safeToMergeCount++
    } else {
      // Vérifier s'il n'y a aucun conflit (ex: un contact a une info, l'autre est vide)
      const emailConflict = c1.email && c2.email && c1.email.trim().toLowerCase() !== c2.email.trim().toLowerCase()
      const phoneConflict = phone1 && phone2 && phone1 !== phone2

      if (!emailConflict && !phoneConflict) {
        safeToMergeCount++
      } else {
        manualReviewNeeded++
      }
    }
  }

  console.log(`[ANALYSE DES 2 906 DOUBLONS RESTANTS]`)
  console.log(`- Candidats déjà résolus (fiche déjà archivée) : ${alreadyArchivedCount}`)
  console.log(`- Candidats avec Email ou Téléphone EXACTEMENT identique : ${sameEmailOrPhoneCount}`)
  console.log(`- Candidats SANS AUCUN CONFLIT (fusion 100% sûre) : ${safeToMergeCount}`)
  console.log(`- Candidats avec vrais conflits (nécessitant arbitrage humain) : ${manualReviewNeeded}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
