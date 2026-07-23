'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { extractVariablesFromText } from '@/lib/mail-template-engine'

export async function getMailTemplates() {
  const session = await getSession()
  if (!session?.userId) throw new Error("Non authentifié")

  return prisma.mailTemplate.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ],
    include: {
      createdBy: { select: { firstName: true, lastName: true } }
    }
  })
}

export async function createMailTemplate(data: {
  code: string
  name: string
  category: string
  description?: string
  bodyStructure: string
}) {
  const session = await getSession()
  if (!session?.userId) throw new Error("Non authentifié")
  requirePermission(session.role, 'MANAGE_SETTINGS')

  const requiredVariables = extractVariablesFromText(data.bodyStructure)

  const template = await prisma.mailTemplate.create({
    data: {
      code: data.code.toUpperCase().replace(/\s+/g, '_'),
      name: data.name,
      category: data.category,
      description: data.description || null,
      bodyStructure: data.bodyStructure,
      requiredVariables,
      version: 1,
      status: 'PUBLIE',
      createdById: session.userId
    }
  })

  revalidatePath('/admin/mail-templates')
  revalidatePath('/mails')
  return template
}

export async function updateMailTemplate(id: string, data: {
  name: string
  category: string
  description?: string
  bodyStructure: string
  status: string
  incrementVersion?: boolean
}) {
  const session = await getSession()
  if (!session?.userId) throw new Error("Non authentifié")
  requirePermission(session.role, 'MANAGE_SETTINGS')

  const existing = await prisma.mailTemplate.findUnique({ where: { id } })
  if (!existing) throw new Error("Modèle introuvable")

  const requiredVariables = extractVariablesFromText(data.bodyStructure)
  const newVersion = data.incrementVersion ? existing.version + 1 : existing.version

  const updated = await prisma.mailTemplate.update({
    where: { id },
    data: {
      name: data.name,
      category: data.category,
      description: data.description || null,
      bodyStructure: data.bodyStructure,
      requiredVariables,
      status: data.status,
      version: newVersion
    }
  })

  revalidatePath('/admin/mail-templates')
  revalidatePath('/mails')
  return updated
}

export async function deleteMailTemplate(id: string) {
  const session = await getSession()
  if (!session?.userId) throw new Error("Non authentifié")
  requirePermission(session.role, 'MANAGE_SETTINGS')

  await prisma.mailTemplate.delete({ where: { id } })
  revalidatePath('/admin/mail-templates')
  revalidatePath('/mails')
}
