import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const taskId = formData.get('taskId') as string | null
    const mailCaseId = formData.get('mailCaseId') as string | null
    const questionId = formData.get('questionId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom unique pour éviter les écrasements
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const filepath = join(uploadDir, uniqueSuffix + '-' + file.name)

    await writeFile(filepath, buffer)

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        filepath: filepath,
        mimeType: file.type,
        size: file.size,
        taskId: taskId || null,
        mailCaseId: mailCaseId || null,
        questionId: questionId || null,
        uploadedById: session.userId
      }
    })

    return NextResponse.json({ success: true, attachment })
  } catch (error) {
    console.error('Erreur upload:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  }
}
