import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    // Authorization
    try {
      requirePermission(session.role, 'UPLOAD_DOCUMENTS')
    } catch (e) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const body = await req.json()
    const { title, content, documentType, confidentiality, entityType, entityId, folderId } = body
    
    if (!title) return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })
    if (!content) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })

    const buffer = Buffer.from(content, 'utf-8')
    const storageName = uuidv4()
    const extension = '.md'
    const fileName = `${storageName}${extension}`
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch(e) {}
    
    const filePath = path.join(uploadDir, fileName)
    
    try {
      await fs.writeFile(filePath, buffer)
    } catch (fsError) {
      console.error('Local create doc file error:', fsError)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde locale du document' }, { status: 500 })
    }

    const dataPayload: any = {
      title,
      documentType: documentType || 'NOTE',
      confidentiality: confidentiality || 'INTERNE',
      originalName: `${title}${extension}`,
      storageName,
      extension,
      mimeType: 'text/markdown',
      size: buffer.length,
      storagePath: `/uploads/${fileName}`,
      extractedText: content,
      uploadedById: session.userId,
      folderId: folderId || null,
    }

    if (entityType && entityId) {
      if (entityType === 'contact') dataPayload.contactId = entityId
      else if (entityType === 'task') dataPayload.taskId = entityId
      else if (entityType === 'mailCase') dataPayload.mailCaseId = entityId
      else if (entityType === 'question') dataPayload.questionId = entityId
    }

    const doc = await prisma.document.create({
      data: dataPayload
    })

    return NextResponse.json(doc)
  } catch (error: any) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 })
  }
}
