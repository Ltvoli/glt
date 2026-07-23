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
      { originalName: { contains: query, mode: 'insensitive' } },
      { extractedText: { contains: query, mode: 'insensitive' } },
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

  const docs = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { firstName: true, lastName: true } },
      signedBy: { select: { firstName: true, lastName: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      task: { select: { id: true, title: true } },
      mailCase: { select: { id: true, reference: true, subject: true } },
      question: { select: { id: true, title: true, anNumber: true } },
      versions: {
        select: { id: true, versionNumber: true, createdAt: true },
        orderBy: { versionNumber: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return docs.map(doc => ({
    ...doc,
    uploadedBy: {
      name: `${doc.uploadedBy?.firstName || ''} ${doc.uploadedBy?.lastName || ''}`.trim() || 'Utilisateur inconnu'
    },
    signedBy: doc.signedBy ? {
      name: `${doc.signedBy?.firstName || ''} ${doc.signedBy?.lastName || ''}`.trim()
    } : null
  }))
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

export async function bulkMoveDocuments(ids: string[], folderId: string | null) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.updateMany({
    where: { id: { in: ids } },
    data: { folderId }
  })

  revalidatePath('/documents')
  return { success: true, count: ids.length }
}

export async function bulkUpdateConfidentiality(ids: string[], confidentiality: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.updateMany({
    where: { id: { in: ids } },
    data: { confidentiality }
  })

  revalidatePath('/documents')
  return { success: true, count: ids.length }
}

export async function bulkUpdateStatus(ids: string[], status: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.updateMany({
    where: { id: { in: ids } },
    data: { status }
  })

  revalidatePath('/documents')
  return { success: true, count: ids.length }
}

export async function bulkDeleteDocuments(ids: string[]) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.updateMany({
    where: { id: { in: ids } },
    data: { archivedAt: new Date() }
  })

  revalidatePath('/documents')
  return { success: true, count: ids.length }
}

// --- NOUVELLES ACTIONS : AUDIT, VERSIONING, SIGNATURE & MODÈLES ---

export async function logDocumentAccess(documentId: string, action: string, details?: string) {
  const session = await getSession()
  if (!session?.userId) return

  await prisma.documentAccessLog.create({
    data: {
      documentId,
      userId: session.userId,
      action,
      details
    }
  })
}

export async function getDocumentAccessLogs(documentId: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'VIEW_DOCUMENTS')

  const logs = await prisma.documentAccessLog.findMany({
    where: { documentId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return logs.map(l => ({
    ...l,
    userName: `${l.user.firstName} ${l.user.lastName}`.trim() || l.user.email
  }))
}

export async function getDocumentVersions(documentId: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'VIEW_DOCUMENTS')

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    include: {
      uploadedBy: { select: { firstName: true, lastName: true } }
    },
    orderBy: { versionNumber: 'desc' }
  })

  return versions.map(v => ({
    ...v,
    uploadedByName: `${v.uploadedBy.firstName} ${v.uploadedBy.lastName}`.trim()
  }))
}

export async function restoreDocumentVersion(documentId: string, versionId: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId }
  })
  if (!version || version.documentId !== documentId) {
    throw new Error('Version introuvable')
  }

  const currentDoc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { versions: true }
  })
  if (!currentDoc) throw new Error('Document introuvable')

  // Sauvegarder la version actuelle avant restauration si elle n'est pas déjà archivée
  const nextVersionNum = currentDoc.versions.length + 1
  await prisma.documentVersion.create({
    data: {
      documentId,
      versionNumber: nextVersionNum,
      originalName: currentDoc.originalName,
      storageName: currentDoc.storageName,
      extension: currentDoc.extension,
      mimeType: currentDoc.mimeType,
      size: currentDoc.size,
      storagePath: currentDoc.storagePath,
      extractedText: currentDoc.extractedText,
      uploadedById: session.userId,
      notes: `Sauvegarde automatique avant restauration de la V${version.versionNumber}`
    }
  })

  // Appliquer la version restaurée sur le document
  await prisma.document.update({
    where: { id: documentId },
    data: {
      originalName: version.originalName,
      storageName: version.storageName,
      extension: version.extension,
      mimeType: version.mimeType,
      size: version.size,
      storagePath: version.storagePath,
      extractedText: version.extractedText
    }
  })

  await prisma.documentAccessLog.create({
    data: {
      documentId,
      userId: session.userId,
      action: 'RESTORE_VERSION',
      details: `Restauration de la version V${version.versionNumber}`
    }
  })

  revalidatePath('/documents')
  return { success: true }
}

export async function signDocument(documentId: string, signatureData: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.update({
    where: { id: documentId },
    data: {
      isSigned: true,
      signedAt: new Date(),
      signedById: session.userId,
      signatureData
    }
  })

  await prisma.documentAccessLog.create({
    data: {
      documentId,
      userId: session.userId,
      action: 'SIGN',
      details: `Document signé électroniquement`
    }
  })

  revalidatePath('/documents')
  return { success: true }
}

export async function getDocumentTemplates() {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  return await prisma.documentTemplate.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function generateDocumentFromTemplate(templateId: string, title: string, folderId?: string, contactId?: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId }
  })
  if (!template) throw new Error('Modèle introuvable')

  let contactName = 'Monsieur / Madame'
  let contactEmail = ''
  let contactPhone = ''
  let contactAddress = ''

  if (contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })
    if (contact) {
      contactName = `${contact.firstName} ${contact.lastName}`
      contactEmail = contact.email || ''
      contactPhone = contact.mobilePhone || ''
      contactAddress = [contact.address, contact.postalCode, contact.city].filter(Boolean).join(' ')
    }
  }

  let htmlContent = template.htmlContent || `<p>Document généré à partir du modèle <strong>${template.name}</strong></p>`
  htmlContent = htmlContent
    .replace(/\{\{CONTACT_NAME\}\}/g, contactName)
    .replace(/\{\{CONTACT_EMAIL\}\}/g, contactEmail)
    .replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone)
    .replace(/\{\{CONTACT_ADDRESS\}\}/g, contactAddress)
    .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString('fr-FR'))

  const documentName = `${title}.html`
  const doc = await prisma.document.create({
    data: {
      title,
      documentType: 'NOTE',
      originalName: documentName,
      storageName: `${Date.now()}_${documentName}`,
      extension: '.html',
      mimeType: 'text/html',
      size: Buffer.byteLength(htmlContent, 'utf-8'),
      storagePath: '/uploads/generated',
      extractedText: htmlContent,
      confidentiality: 'INTERNE',
      status: 'VALIDATED',
      uploadedById: session.userId,
      folderId: folderId || null,
      contactId: contactId || null
    }
  })

  await prisma.documentAccessLog.create({
    data: {
      documentId: doc.id,
      userId: session.userId,
      action: 'GENERATE_TEMPLATE',
      details: `Généré depuis le modèle ${template.name}`
    }
  })

  revalidatePath('/documents')
  return { success: true, documentId: doc.id }
}


