import prisma from '@/lib/prisma'

export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  userId: string,
  newValues?: Record<string, any>,
  oldValues?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        newValues: newValues ? JSON.stringify(newValues) : null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
      }
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
