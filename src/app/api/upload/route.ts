import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.vbs']

export async function POST(request: Request) {
  let session
  try {
    session = await requireWriteAccess()
  } catch (err: any) {
    return new NextResponse(err.message, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string

    if (!file || !entityType || !entityId) {
      return new NextResponse('Paramètres manquants', { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse('Fichier trop volumineux (10Mo max)', { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return new NextResponse('Type de fichier non autorisé', { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueFilename = `${uuidv4()}${ext}`
    
    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('crm-attachments')
      .upload(uniqueFilename, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Erreur Supabase: ${uploadError.message}`)
    }

    // Récupération de l'URL publique ou du chemin
    const filepath = uploadData.path

    const attachmentData: any = {
      filename: file.name,
      filepath: filepath,
      mimeType: file.type,
      size: file.size,
      uploadedById: session.userId,
    }

    if (entityType === 'task') attachmentData.taskId = entityId
    if (entityType === 'mail') attachmentData.mailCaseId = entityId
    if (entityType === 'qe') attachmentData.questionId = entityId

    const attachment = await prisma.attachment.create({
      data: attachmentData
    })

    // Audit log
    await logAudit('UPLOAD_FILE', 'Attachment', attachment.id, session.userId, { filename: file.name, entityType, entityId })

    return NextResponse.json(attachment)
  } catch (err) {
    console.error('Upload Error:', err)
    return new NextResponse('Erreur Serveur', { status: 500 })
  }
}
