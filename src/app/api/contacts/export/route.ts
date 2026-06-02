import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  
  if (!session?.userId) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: { archivedAt: null },
      include: {
        tags: { include: { tag: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const data = contacts.map(c => ({
      'ID': c.id,
      'Date de création': c.createdAt.toISOString().split('T')[0],
      'Prénom': c.firstName,
      'Nom': c.lastName,
      'Genre': c.gender || '',
      'Email': c.email || '',
      'Portable': c.mobilePhone || '',
      'Téléphone': c.phone || '',
      'Date de naissance': c.birthDate ? c.birthDate.toISOString().split('T')[0] : '',
      'Numéro': c.streetNumber || '',
      'Rue/Voie': c.streetName || '',
      'Code Postal': c.postalCode || '',
      'Commune': c.city || '',
      'Secteur': c.territorySector || '',
      'Type': c.type,
      'Source': c.source || '',
      'Niveau de Soutien': c.supportLevel || '',
      'Statut WhatsApp': c.whatsappStatus || '',
      'Abonné Newsletter': c.newsletter ? 'Oui' : 'Non',
      'LinkedIn': c.linkedinUrl || '',
      'Tags': c.tags.map((ct: any) => ct.tag.name).join(', '),
      'Notes': c.notes || ''
    }))

    const csv = Papa.unparse(data)

    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="contacts_export_${new Date().toISOString().split('T')[0]}.csv"`)

    return new NextResponse(csv, { status: 200, headers })

  } catch (error) {
    console.error('Export error:', error)
    return new NextResponse('Erreur lors de l\'export CSV', { status: 500 })
  }
}
