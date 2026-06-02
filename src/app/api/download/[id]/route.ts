import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    })

    if (!attachment || !existsSync(attachment.filepath)) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    const fileBuffer = await readFile(attachment.filepath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      }
    })
  } catch (error) {
    console.error('Erreur download:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
