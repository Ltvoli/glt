'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export async function createQE(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const ministry = formData.get('ministry') as string
  const theme = formData.get('theme') as string
  const anNumber = formData.get('anNumber') as string
  const content = formData.get('content') as string
  const notes = formData.get('notes') as string
  const assigneeId = formData.get('assigneeId') as string
  const contactId = formData.get('contactId') as string
  const taskId = formData.get('taskId') as string

  if (!title || !type) {
    return { error: 'Le titre et le type sont obligatoires.' }
  }

  try {
    const newQE = await prisma.writtenQuestion.create({
      data: {
        title,
        type,
        ministry: ministry || null,
        theme: theme || null,
        anNumber: anNumber || null,
        content: content || null,
        notes: notes || null,
        assigneeId: assigneeId || null,
        status: 'DEPOSEE' // By default when created
      }
    })

    // Links
    if (contactId) {
      await prisma.globalLink.create({
        data: { questionId: newQE.id, contactId }
      })
    }

    if (taskId) {
      await prisma.globalLink.create({
        data: { questionId: newQE.id, taskId }
      })
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'WrittenQuestion',
        entityId: newQE.id,
        userId: session.userId,
        newValues: JSON.stringify({ title, type, ministry })
      }
    })

    // Handle optional attachment upload
    const attachmentFile = formData.get('attachment') as File | null
    if (attachmentFile && attachmentFile.size > 0) {
      const bytes = await attachmentFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uploadDir = join(process.cwd(), 'uploads')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const filepath = join(uploadDir, uniqueSuffix + '-' + attachmentFile.name)

      await writeFile(filepath, buffer)

      await prisma.attachment.create({
        data: {
          filename: attachmentFile.name,
          filepath: filepath,
          mimeType: attachmentFile.type,
          size: attachmentFile.size,
          questionId: newQE.id,
          uploadedById: session.userId
        }
      })
    }

  } catch (error) {
    console.error(error)
    return { error: 'Erreur lors de la création de la question.' }
  }

  redirect('/qe')
}

export async function updateQEStatus(qeId: string, status: string) {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  const qe = await prisma.writtenQuestion.findUnique({ where: { id: qeId } })
  if (!qe) throw new Error('Question introuvable')

  // Automatically update dates based on status if needed
  let dataToUpdate: any = { status }
  if (status === 'DEPOSEE' && !qe.depositDate) {
    dataToUpdate.depositDate = new Date()
  } else if (status === 'REPONSE_RECUE' && !qe.responseDate) {
    dataToUpdate.responseDate = new Date()
  }

  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: dataToUpdate
  })

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE_STATUS',
      entityType: 'WrittenQuestion',
      entityId: qeId,
      userId: session.userId,
      oldValues: JSON.stringify({ status: qe.status }),
      newValues: JSON.stringify(dataToUpdate)
    }
  })

  revalidatePath(`/qe/${qeId}`)
  revalidatePath('/qe')
}

export async function updateQEResponse(qeId: string, responseContent: string) {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')

  await prisma.writtenQuestion.update({
    where: { id: qeId },
    data: { responseContent, status: 'REPONSE_RECUE', responseDate: new Date() }
  })

  revalidatePath(`/qe/${qeId}`)
}
