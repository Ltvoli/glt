import prisma from '@/lib/prisma'

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  userId: string | null,
  details?: any,
  ip?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        details: details || undefined,
        ip: ip || null,
      }
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

