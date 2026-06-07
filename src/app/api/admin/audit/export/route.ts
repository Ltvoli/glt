import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'

export async function GET() {
  const session = await getSession()
  if (!session?.userId || (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN')) {
    return new NextResponse('Non autorisé', { status: 403 })
  }

  // Fetch all logs (in production, you might want to limit this to the last 30 days or stream it)
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10000, // Safe limit for memory
    include: {
      user: { select: { email: true } }
    }
  })

  const data = logs.map(log => ({
    Date: log.createdAt.toISOString(),
    Utilisateur: log.user?.email || 'Système',
    Action: log.action,
    Entité: log.entity,
    'ID Entité': log.entityId || '',
    'Anciennes Valeurs': log.oldValues || '',
    'Nouvelles Valeurs': log.newValues || '',
  }))

  const csv = Papa.unparse(data)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
