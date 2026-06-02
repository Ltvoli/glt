import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const users = [
    { name: 'Lionel Tivoli', email: 'lionel@tivoli.fr', role: 'ADMIN' },
    { name: 'Magali', email: 'magali@tivoli.fr', role: 'ADMIN' },
    { name: 'Andréa', email: 'andrea@tivoli.fr', role: 'USER' },
    { name: 'Franck', email: 'franck@tivoli.fr', role: 'USER' },
    { name: 'Pierre', email: 'pierre@tivoli.fr', role: 'USER' },
  ]

  // Default password: password123
  const passwordHash = await bcrypt.hash('password123', 10)

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      await prisma.user.create({
        data: {
          ...u,
          passwordHash,
        },
      })
      console.log(`Created user ${u.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
