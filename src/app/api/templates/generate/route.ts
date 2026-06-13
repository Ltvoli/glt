import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) return new NextResponse('Unauthorized', { status: 401 })

    const { templateId, entityId } = await req.json()
    if (!templateId || !entityId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    // Télécharger le fichier depuis Supabase
    const { data: fileData, error: downloadError } = await supabase.storage.from('crm-attachments').download(template.storagePath)
    if (downloadError || !fileData) {
      console.error('Supabase download error:', downloadError)
      return NextResponse.json({ error: 'Could not download template' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Préparer les données à fusionner
    let mergeData: any = {}
    const dateStr = new Date().toLocaleDateString('fr-FR')

    if (template.entityType === 'CONTACT') {
      const contact = await prisma.contact.findUnique({ where: { id: entityId } })
      if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
      mergeData = {
        prenom: contact.firstName,
        nom: contact.lastName,
        email: contact.email || '',
        telephone: contact.phone || contact.mobilePhone || '',
        adresse: `${contact.streetName || ''} ${contact.postalCode || ''} ${contact.city || ''}`,
        date: dateStr
      }
    } else if (template.entityType === 'MAIL') {
      const mail = await prisma.mailCase.findUnique({ 
        where: { id: entityId },
        include: { links: { include: { contact: true } } }
      })
      if (!mail) return NextResponse.json({ error: 'Mail not found' }, { status: 404 })
      
      const primaryContact = mail.links.find(l => l.contact)?.contact || ({} as any)
      mergeData = {
        prenom: primaryContact.firstName || mail.senderName || '',
        nom: primaryContact.lastName || '',
        adresse: primaryContact.city ? `${primaryContact.streetName || ''} ${primaryContact.postalCode || ''} ${primaryContact.city}` : (mail.city || ''),
        reference: mail.reference,
        objet: mail.subject,
        date: dateStr
      }
    }

    // Processus DOCXTEMPLATER
    const zip = new PizZip(buffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render(mergeData)

    const generatedBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    // Retourner le fichier en tant que stream
    return new NextResponse(generatedBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Generated_${template.name}_${entityId}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }
    })

  } catch (error: any) {
    console.error('Template generation error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
