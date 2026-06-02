import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return new NextResponse('Non autorisé', { status: 401 })

  const { id } = await params

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) return new NextResponse('Fichier introuvable', { status: 404 })

    // Normalement, il faudrait vérifier ici si l'user a le droit de voir la tâche/mail/qe associée
    // Pour l'instant, on laisse l'accès aux utilisateurs authentifiés

    const filePath = path.join(process.cwd(), attachment.filepath)
    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return new NextResponse('Erreur lors du téléchargement', { status: 500 })
  }
}
