'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function getDocuments(
  query?: string, 
  type?: string, 
  confidentiality?: string,
  author?: string,
  relation?: string,
  status?: string,
  folderId?: string,
  tag?: string
) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'VIEW_DOCUMENTS')

  const where: any = { archivedAt: null }
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }
  if (type) {
    where.documentType = type
  }
  if (confidentiality) {
    where.confidentiality = confidentiality
  }
  if (author) {
    where.uploadedById = author
  }
  if (status) {
    where.status = status
  }
  if (folderId) {
    where.folderId = folderId
  }
  if (tag) {
    where.tags = { contains: tag }
  }
  if (relation) {
    switch (relation) {
      case 'ORPHELIN':
        where.contactId = null
        where.taskId = null
        where.mailCaseId = null
        where.questionId = null
        break
      case 'CONTACT':
        where.contactId = { not: null }
        break
      case 'TASK':
        where.taskId = { not: null }
        break
      case 'MAIL':
        where.mailCaseId = { not: null }
        break
      case 'QE':
        where.questionId = { not: null }
        break
    }
  }

  // Restrictions de confidentialité
  if (session.role === 'USER' || session.role === 'READONLY') {
    // Les utilisateurs normaux ne voient que INTERNE et RESTREINT
    where.confidentiality = { in: ['INTERNE', 'RESTREINT'] }
  }

  return await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      task: { select: { id: true, title: true } },
      mailCase: { select: { id: true, reference: true, subject: true } },
      question: { select: { id: true, title: true, anNumber: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function deleteDocument(id: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.update({
    where: { id },
    data: { archivedAt: new Date() }
  })

  revalidatePath('/documents')
}

export async function updateDocument(id: string, data: { title?: string, documentType?: string, confidentiality?: string, status?: string, folderId?: string | null, tags?: string[] }) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  const updateData: any = { ...data }
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags)
  }

  await prisma.document.update({
    where: { id },
    data: updateData
  })

  revalidatePath('/documents')
}
