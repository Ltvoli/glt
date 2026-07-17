'use server'

import { getSession } from '@/lib/session'
import { extractDocxText } from '@/lib/docx-extractor'
import { convertDocxTextToHtmlTemplate } from '@/lib/gemini'

async function requireAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR') {
    throw new Error('Réservé aux administrateurs ou superviseurs')
  }
  return session
}

export async function convertDocxToTemplateAction(base64Docx: string) {
  try {
    await requireAdminSession()

    if (!base64Docx) {
      throw new Error('Aucun fichier fourni')
    }

    // Décoder le fichier Word
    const buffer = Buffer.from(base64Docx, 'base64')

    // Appeler extractDocxText
    const docxText = extractDocxText(buffer)
    if (!docxText || !docxText.trim()) {
      throw new Error('Impossible d\'extraire du texte de ce fichier Word')
    }

    // Appeler l'API Gemini
    const { htmlContent, templateName } = await convertDocxTextToHtmlTemplate(docxText)

    return {
      success: true,
      htmlContent,
      templateName
    }
  } catch (error: any) {
    console.error('[convertDocxToTemplateAction] Error:', error)
    return {
      success: false,
      error: error.message || 'Une erreur inconnue est survenue'
    }
  }
}

export async function deleteTemplateAction(templateId: string) {
  try {
    await requireAdminSession()
    const prisma = (await import('@/lib/prisma')).default

    // Find template to delete storage file if any
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      throw new Error('Modèle introuvable')
    }

    // Supprimer le modèle
    await prisma.documentTemplate.delete({
      where: { id: templateId }
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/admin/templates/docs')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteTemplateAction] Error:', error)
    return {
      success: false,
      error: error.message || 'Une erreur inconnue est survenue'
    }
  }
}
