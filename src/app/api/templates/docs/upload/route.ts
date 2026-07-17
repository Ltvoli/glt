import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string || ''
    const entityType = formData.get('entityType') as string || 'MAIL'
    const htmlContent = formData.get('htmlContent') as string | null

    if (!name) return NextResponse.json({ error: 'Nom du modèle manquant' }, { status: 400 })

    // Si c'est un modèle en ligne
    if (htmlContent !== null) {
      const template = await prisma.documentTemplate.create({
        data: {
          name,
          description,
          entityType,
          originalName: 'Modèle en Ligne',
          storageName: '',
          storagePath: '',
          htmlContent
        }
      })
      return NextResponse.json({ success: true, template })
    }

    // Sinon, c'est un modèle Word (DOCX)
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return NextResponse.json({ error: 'Seuls les fichiers .docx sont acceptés' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageName = uuidv4() + '.docx'
    
    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('crm-attachments')
      .upload(`templates/${storageName}`, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Erreur stockage cloud' }, { status: 500 })
    }

    try {
      const template = await prisma.documentTemplate.create({
        data: {
          name,
          description,
          entityType,
          originalName: file.name,
          storageName,
          storagePath: uploadData.path
        }
      })
      return NextResponse.json({ success: true, template })
    } catch (prismaError) {
      // Rollback Supabase upload
      await supabase.storage.from('crm-attachments').remove([`templates/${storageName}`])
      throw prismaError
    }
  } catch (error: any) {
    console.error('Upload template error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
