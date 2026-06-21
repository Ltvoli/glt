import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import fs from 'fs/promises'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png'
]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string || (file ? file.name : '')
    const documentType = formData.get('documentType') as string || 'AUTRE'
    const confidentiality = formData.get('confidentiality') as string || 'INTERNE'
    
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    const folderId = formData.get('folderId') as string || null
    
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
    
    let isLocal = true
    let storagePath = ''
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const useSupabase = supabaseUrl && 
                        supabaseUrl !== 'https://dummy.supabase.co' &&
                        process.env.SUPABASE_SERVICE_ROLE_KEY &&
                        process.env.SUPABASE_SERVICE_ROLE_KEY !== 'dummy'

    if (useSupabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('crm-attachments')
          .upload(`documents/${fileName}`, buffer, {
            contentType: file.type,
            upsert: false
          })
        
        if (!uploadError) {
          isLocal = false
          storagePath = uploadData.path
        } else {
          console.error('Supabase upload error, falling back to local:', uploadError)
        }
      } catch (err) {
        console.error('Supabase upload exception, falling back to local:', err)
      }
    }

    if (isLocal) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      try {
        await fs.mkdir(uploadDir, { recursive: true })
      } catch(e) {}
      
      const filePath = path.join(uploadDir, fileName)
      try {
        await fs.writeFile(filePath, buffer)
        storagePath = filePath
      } catch (fsError) {
        console.error('Local upload error:', fsError)
        return NextResponse.json({ error: 'Erreur lors de la sauvegarde locale du fichier' }, { status: 500 })
      }
    }

    let extractedText = ''
    try {
      if (file.type === 'application/pdf') {
        try {
          const pdfParseLib = await import('pdf-parse')
          const pdfParseFn = pdfParseLib.default ?? pdfParseLib
          const pdfData = await pdfParseFn(buffer)
          extractedText = pdfData.text
        } catch (e) {
          console.error('Erreur de parsing PDF:', e)
        }
      }
      // Image OCR using Tesseract is deactivated (times out on Vercel serverless)
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
      storagePath,
      confidentiality,
      uploadedById: session.userId,
      extractedText: extractedText.trim() || null,
      folderId: folderId || null,
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

