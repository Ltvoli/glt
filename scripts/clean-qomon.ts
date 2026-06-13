const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const count = await prisma.contact.count({
    where: { source: 'QOMON', createdAt: { gte: today } }
  })
  console.log('Contacts Qomon importés aujourd\'hui :', count)

  if (count > 0) {
    await prisma.contactTag.deleteMany({
      where: { contact: { source: 'QOMON', createdAt: { gte: today } } }
    })
    await prisma.duplicateCandidate.deleteMany({
      where: {
        OR: [
          { contact1: { source: 'QOMON', createdAt: { gte: today } } },
          { contact2: { source: 'QOMON', createdAt: { gte: today } } }
        ]
      }
    })
    const del = await prisma.contact.deleteMany({
      where: { source: 'QOMON', createdAt: { gte: today } }
    })
    console.log('✅ Supprimés :', del.count)
  } else {
    console.log('Rien à supprimer.')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
