import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import Tesseract from 'tesseract.js'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const pdfParse = require('pdf-parse')
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    // Authorization
    try {
      requirePermission(session.role, 'UPLOAD_DOCUMENTS')
    } catch (e) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string || (file ? file.name : '')
    const documentType = formData.get('documentType') as string || 'AUTRE'
    const confidentiality = formData.get('confidentiality') as string || 'INTERNE'
    
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageName = uuidv4()
    const extension = path.extname(file.name) || ('.' + file.name.split('.').pop())
    const fileName = `${storageName}${extension}`
    
    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('crm-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Erreur lors du stockage sur le cloud' }, { status: 500 })
    }

    let extractedText = ''
    try {
      if (file.type === 'application/pdf') {
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text
      } else if (file.type.startsWith('image/')) {
        const { data: { text } } = await Tesseract.recognize(buffer, 'fra')
        extractedText = text
      }
    } catch (ocrError) {
      console.error('OCR/Parse error:', ocrError)
    }

    const dataPayload: any = {
      title,
      documentType,
      originalName: file.name,
      storageName: fileName,
      extension,
      mimeType: file.type,
      size: file.size,
      storagePath: uploadData.path, // Supabase path
      confidentiality,
      uploadedById: session.userId,
      extractedText: extractedText.trim() || null,
    }

    if (entityType && entityId) {
      if (entityType === 'mail') dataPayload.mailCaseId = entityId
      if (entityType === 'task') dataPayload.taskId = entityId
      if (entityType === 'contact') dataPayload.contactId = entityId
      if (entityType === 'qe') dataPayload.questionId = entityId
    }

    const doc = await prisma.document.create({
      data: dataPayload
    })

    return NextResponse.json({ success: true, document: doc })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erreur interne lors de l\'upload' }, { status: 500 })
  }
}

