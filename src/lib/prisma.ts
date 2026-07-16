import { PrismaClient } from '@prisma/client'

function computeAgeRange(birthDateInput: any): string | null {
  if (!birthDateInput) return null

  let dateVal: any = birthDateInput
  if (typeof birthDateInput === 'object' && birthDateInput !== null) {
    if ('set' in birthDateInput) {
      dateVal = birthDateInput.set
    } else if (birthDateInput instanceof Date) {
      dateVal = birthDateInput
    } else {
      return null
    }
  }

  if (!dateVal) return null
  const birthDate = new Date(dateVal)
  if (isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  if (age < 18) return 'Moins de 18 ans'
  if (age <= 25) return '18-25 ans'
  if (age <= 35) return '26-35 ans'
  if (age <= 50) return '36-50 ans'
  if (age <= 65) return '51-65 ans'
  return 'Plus de 65 ans'
}

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
    },
    query: {
      contact: {
        async create({ args, query }) {
          if (args.data && 'birthDate' in args.data) {
            args.data.ageRange = computeAgeRange(args.data.birthDate)
          }
          return query(args)
        },
        async update({ args, query }) {
          if (args.data && 'birthDate' in args.data) {
            args.data.ageRange = computeAgeRange(args.data.birthDate)
          }
          return query(args)
        },
        async createMany({ args, query }) {
          if (args.data) {
            const dataArray = Array.isArray(args.data) ? args.data : [args.data]
            for (const item of dataArray) {
              if ('birthDate' in item) {
                item.ageRange = computeAgeRange(item.birthDate)
              }
            }
          }
          return query(args)
        },
        async updateMany({ args, query }) {
          if (args.data && 'birthDate' in args.data) {
            args.data.ageRange = computeAgeRange(args.data.birthDate)
          }
          return query(args)
        }
      }
    }
  })
}

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>

declare global {
  var prismaGlobal: undefined | ExtendedPrismaClient
}

const prisma = (globalThis.prismaGlobal && '$extends' in (globalThis.prismaGlobal as any)) ? globalThis.prismaGlobal : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma as any

