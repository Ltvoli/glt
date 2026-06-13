const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  const perms = await prisma.mobilePermanence.findMany({
    select: { id: true, title: true, status: true, scheduledStartDate: true }
  })
  console.log('PERMS:', perms)
  await prisma.$disconnect()
}

main()
