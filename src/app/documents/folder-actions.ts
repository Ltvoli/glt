'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function getFolders() {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'VIEW_DOCUMENTS')

  return await prisma.documentFolder.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function createFolder(name: string, color: string = '#64748b', parentId?: string | null) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  if (!name || name.trim() === '') throw new Error('Le nom du dossier est requis')

  const folder = await prisma.documentFolder.create({
    data: {
      name: name.trim(),
      color,
      parentId: parentId || null
    }
  })

  revalidatePath('/documents')
  return folder
}

export async function updateFolder(id: string, name: string, color: string, parentId?: string | null) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  if (!name || name.trim() === '') throw new Error('Le nom du dossier est requis')

  const folder = await prisma.documentFolder.update({
    where: { id },
    data: {
      name: name.trim(),
      color,
      parentId: parentId !== undefined ? parentId : undefined
    }
  })

  revalidatePath('/documents')
  return folder
}

export async function deleteFolder(id: string) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.updateMany({
    where: { folderId: id },
    data: { folderId: null }
  })

  await prisma.documentFolder.delete({
    where: { id }
  })

  revalidatePath('/documents')
}

export async function moveDocumentToFolder(docId: string, folderId: string | null) {
  const session = await getSession()
  if (!session) throw new Error('Non authentifié')
  requirePermission(session.role, 'MANAGE_DOCUMENTS')

  await prisma.document.update({
    where: { id: docId },
    data: { folderId }
  })

  revalidatePath('/documents')
}
