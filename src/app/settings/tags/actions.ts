'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateTag(id: string, name: string, color: string) {
  await requireWriteAccess()

  if (!name.trim()) {
    throw new Error('Le nom du tag est obligatoire.')
  }

  // Check if name already exists for another tag
  const existing = await prisma.tag.findUnique({ where: { name: name.trim() } })
  if (existing && existing.id !== id) {
    throw new Error('Un tag avec ce nom existe déjà.')
  }

  await prisma.tag.update({
    where: { id },
    data: { name: name.trim(), color }
  })

  revalidatePath('/settings/tags')
  revalidatePath('/contacts')
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTag(id: string) {
  await requireWriteAccess()

  await prisma.tag.delete({
    where: { id }
  })

  revalidatePath('/settings/tags')
  revalidatePath('/contacts')
  revalidatePath('/tasks')
  return { success: true }
}
