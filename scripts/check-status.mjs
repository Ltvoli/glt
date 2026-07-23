import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const activeContacts = await prisma.contact.count({ where: { archivedAt: null } })
  const archivedContacts = await prisma.contact.count({ where: { archivedAt: { not: null } } })
  const pendingCandidates = await prisma.duplicateCandidate.count({ where: { status: 'PENDING' } })
  
  const dupGroups = await prisma.$queryRaw`
    SELECT COUNT(*)::integer as count FROM (
      SELECT 1
      FROM "Contact"
      WHERE "archivedAt" IS NULL
      GROUP BY LOWER("firstName"), LOWER(COALESCE(NULLIF("usageName", ''), "lastName"))
      HAVING COUNT(*) > 1
    ) dup;
  `
  
  console.log(`[STATS DETAILÉES VPS]`)
  console.log(`- Contacts actifs : ${activeContacts}`)
  console.log(`- Contacts archivés (fusionnés) : ${archivedContacts}`)
  console.log(`- Doublons potentiels en attente de validation (interface) : ${pendingCandidates}`)
  console.log(`- Groupes de doublons de noms exacts restants (avec conflits email/tél) : ${dupGroups[0]?.count || 0}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
