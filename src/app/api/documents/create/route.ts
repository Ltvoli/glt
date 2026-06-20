import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import { supabase } from '@/lib/supabase'

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
    
    let isLocal = true
    let storagePath = ''
    
    const useSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dummy.supabase.co' &&
                        process.env.SUPABASE_SERVICE_ROLE_KEY &&
                        process.env.SUPABASE_SERVICE_ROLE_KEY !== 'dummy'

    if (useSupabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('crm-attachments')
          .upload(`documents/${fileName}`, buffer, {
            contentType: 'text/markdown',
            upsert: false
          })
        
        if (!uploadError) {
          isLocal = false
          storagePath = uploadData.path
        } else {
          console.error('Supabase create upload error, falling back to local:', uploadError)
        }
      } catch (err) {
        console.error('Supabase create upload exception, falling back to local:', err)
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
        storagePath = `/uploads/${fileName}`
      } catch (fsError) {
        console.error('Local create doc file error:', fsError)
        return NextResponse.json({ error: 'Erreur lors de la sauvegarde locale du document' }, { status: 500 })
      }
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
      storagePath,
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
