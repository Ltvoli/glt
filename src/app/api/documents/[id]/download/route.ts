import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getSession()
    if (!session) return new NextResponse('Non authentifié', { status: 401 })
    
    try {
      requirePermission(session.role, 'DOWNLOAD_DOCUMENTS')
    } catch (e) {
      return new NextResponse('Permission refusée', { status: 403 })
    }

    const doc = await prisma.document.findUnique({ where: { id: resolvedParams.id } })
    if (!doc || doc.archivedAt) {
      return new NextResponse('Document introuvable', { status: 404 })
    }

    // Contrôle de niveau de confidentialité
    if (session.role === 'USER' || session.role === 'READONLY') {
      if (!['INTERNE', 'RESTREINT'].includes(doc.confidentiality)) {
        return new NextResponse('Niveau de confidentialité trop élevé', { status: 403 })
      }
    }

    let fileBuffer: Buffer | null = null
    let fileSize = 0
    let filePath = doc.storagePath

    // Vérifier si le chemin commence par /uploads/ (chemin local relatif historique)
    if (filePath.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), 'public', filePath)
    }

    const isSupabasePath = !filePath.startsWith('/') && !filePath.includes(':\\')

    if (isSupabasePath) {
      const { data, error } = await supabase
        .storage
        .from('crm-attachments')
        .download(filePath)

      if (error) {
        console.error('Supabase download error:', error)
        return new NextResponse('Fichier introuvable sur le cloud', { status: 404 })
      }
      
      const arrayBuffer = await data.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
      fileSize = fileBuffer.length
    } else {
      const fileStats = await stat(filePath).catch(() => null)
      if (!fileStats) {
        return new NextResponse('Fichier introuvable sur le disque', { status: 404 })
      }
      fileSize = fileStats.size
    }

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', doc.mimeType)
    responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`)
    responseHeaders.set('Content-Length', fileSize.toString())

    if (fileBuffer) {
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: responseHeaders
      })
    } else {
      const stream = createReadStream(filePath)
      return new NextResponse(stream as any, {
        headers: responseHeaders
      })
    }
  } catch (error) {
    console.error('Download error:', error)
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
