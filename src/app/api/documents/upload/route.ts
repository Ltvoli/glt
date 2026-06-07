import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    const title = formData.get('title') as string
    const documentType = formData.get('documentType') as string || 'AUTRE'
    const confidentiality = formData.get('confidentiality') as string || 'INTERNE'
    
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
    const extension = path.extname(file.name)
    const fileName = `${storageName}${extension}`
    
    // Using a private local directory
    const uploadDir = path.join(process.cwd(), 'private', 'documents')
    await mkdir(uploadDir, { recursive: true })
    
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const doc = await prisma.document.create({
      data: {
        title,
        documentType,
        originalName: file.name,
        storageName: fileName,
        extension,
        mimeType: file.type,
        size: file.size,
        storagePath: filePath, // Stored safely locally
        confidentiality,
        uploadedById: session.userId,
      }
    })

    return NextResponse.json({ success: true, document: doc })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erreur interne lors de l\'upload' }, { status: 500 })
  }
}
