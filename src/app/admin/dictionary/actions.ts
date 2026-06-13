'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'

async function requireAuth() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  return session
}

async function requireAdminSession() {
  const session = await requireAuth()
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Accès refusé. Droits administrateur requis.')
  }
  return session
}

export async function getDictionary(type?: string) {
  await requireAuth()
  return await prisma.appDictionary.findMany({
    where: type ? { type } : undefined,
    orderBy: [
      { type: 'asc' },
      { order: 'asc' },
      { label: 'asc' }
    ]
  })
}

export async function createDictionaryEntry(data: { type: string, code: string, label: string, color?: string | null, icon?: string | null, order?: number, isDefault?: boolean }) {
  await requireAdminSession()
  const result = await prisma.appDictionary.create({
    data: {
      type: data.type,
      code: data.code,
      label: data.label,
      color: data.color,
      icon: data.icon,
      order: data.order ?? 0,
      isDefault: data.isDefault ?? false,
    }
  })
  revalidatePath('/admin/dictionary')
  return result
}

export async function updateDictionaryEntry(id: string, data: { label?: string, color?: string | null, icon?: string | null, order?: number, isActive?: boolean, isDefault?: boolean }) {
  await requireAdminSession()
  const result = await prisma.appDictionary.update({
    where: { id },
    data
  })
  revalidatePath('/admin/dictionary')
  return result
}

export async function deleteDictionaryEntry(id: string) {
  await requireAdminSession()
  await prisma.appDictionary.delete({
    where: { id }
  })
  revalidatePath('/admin/dictionary')
}

export async function getDictionaryTypes() {
  await requireAuth()
  const types = await prisma.appDictionary.groupBy({
    by: ['type'],
    _count: {
      id: true
    }
  })
  return types.map(t => t.type).sort()
}
