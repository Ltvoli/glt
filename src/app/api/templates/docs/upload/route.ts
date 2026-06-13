import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string
    const description = formData.get('description') as string || ''
    const entityType = formData.get('entityType') as string || 'MAIL'

    if (!file || !name) return NextResponse.json({ error: 'Fichier ou nom manquant' }, { status: 400 })

    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return NextResponse.json({ error: 'Seuls les fichiers .docx sont acceptés' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageName = uuidv4() + '.docx'
    
    // Upload vers Supabase Storage dans un bucket 'crm-templates'
    // Ensure bucket exists or fallback to 'crm-attachments'
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
  } catch (error: any) {
    console.error('Upload template error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
