import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requirePermission } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

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

    const fileStats = await stat(doc.storagePath).catch(() => null)
    if (!fileStats) {
      return new NextResponse('Fichier introuvable sur le disque', { status: 404 })
    }

    const stream = createReadStream(doc.storagePath)
    
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
        'Content-Length': fileStats.size.toString()
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
