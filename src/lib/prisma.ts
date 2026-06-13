import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    result: {
      user: {
        name: {
          needs: { firstName: true, lastName: true },
          compute(user) {
            return `${user.firstName} ${user.lastName}`.trim() || 'Sans Nom'
          }
        }
      }
    }
  })
}

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>

declare global {
  var prismaGlobal: undefined | ExtendedPrismaClient
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma as any

