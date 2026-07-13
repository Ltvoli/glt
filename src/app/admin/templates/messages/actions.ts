'use server'

import prisma from '@/lib/prisma'
import { getSession, requireWriteAccess } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

async function requireAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR') {
    throw new Error('Réservé aux administrateurs')
  }
  return session
}

export async function getTemplatesAction() {
  try {
    await requireAdminSession()
    return await prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
  } catch (err: any) {
    console.error('Error fetching templates:', err)
    return []
  }
}

export async function createTemplateAction(
  name: string,
  channel: 'EMAIL' | 'SMS',
  subject: string | null,
  content: string
) {
  try {
    const session = await requireAdminSession()

    if (!name || !name.trim()) throw new Error('Le nom est obligatoire')
    if (!content || !content.trim()) throw new Error('Le contenu est obligatoire')
    if (channel === 'EMAIL' && (!subject || !subject.trim())) {
      throw new Error('Le sujet est obligatoire pour un e-mail')
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name: name.trim(),
        channel,
        subject: channel === 'EMAIL' ? (subject?.trim() || null) : null,
        content: content.trim(),
        variables: JSON.stringify(['firstName', 'lastName', 'city', 'email', 'phone']),
        authorId: session.userId,
        isActive: true
      }
    })

    await logAudit(
      'CREATE_MESSAGE_TEMPLATE',
      'MessageTemplate',
      template.id,
      session.userId,
      { name: template.name, channel }
    )

    revalidatePath('/admin/templates/messages')
    return { success: true, template }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function updateTemplateAction(
  id: string,
  name: string,
  channel: 'EMAIL' | 'SMS',
  subject: string | null,
  content: string,
  isActive: boolean
) {
  try {
    const session = await requireAdminSession()

    if (!name || !name.trim()) throw new Error('Le nom est obligatoire')
    if (!content || !content.trim()) throw new Error('Le contenu est obligatoire')
    if (channel === 'EMAIL' && (!subject || !subject.trim())) {
      throw new Error('Le sujet est obligatoire pour un e-mail')
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        channel,
        subject: channel === 'EMAIL' ? (subject?.trim() || null) : null,
        content: content.trim(),
        isActive
      }
    })

    await logAudit(
      'UPDATE_MESSAGE_TEMPLATE',
      'MessageTemplate',
      id,
      session.userId,
      { name: template.name, channel, isActive }
    )

    revalidatePath('/admin/templates/messages')
    return { success: true, template }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const session = await requireAdminSession()

    const template = await prisma.messageTemplate.delete({
      where: { id }
    })

    await logAudit(
      'DELETE_MESSAGE_TEMPLATE',
      'MessageTemplate',
      id,
      session.userId,
      { name: template.name }
    )

    revalidatePath('/admin/templates/messages')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}
