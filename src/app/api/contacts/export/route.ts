import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'
import { NextRequest, NextResponse } from 'next/server'
import { buildWhereClause } from '@/lib/contacts-filter'
import { logAudit } from '@/lib/audit'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function escapeXml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildXls(headers: string[], rows: string[][]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Contacts">
    <Table>
      <Row>
        ${headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
      </Row>
      ${rows.map(row =>
        `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`
      ).join('')}
    </Table>
  </Worksheet>
</Workbook>`
}


function formatContacts(contacts: any[]) {
  const HEADERS = [
    'ID', 'Date de création', 'Prénom', 'Nom', 'Genre', 'Email',
    'Portable', 'Téléphone', 'Date de naissance',
    'Numéro', 'Rue / Voie', 'Code Postal', 'Commune',
    'Territoire', 'Type', 'Source', 'Niveau de Soutien',
    'Étape rencontre', 'WhatsApp', 'Newsletter',
    'LinkedIn', 'Tags', 'Notes',
  ]

  const rows = contacts.map(c => [
    c.id,
    c.createdAt.toISOString().split('T')[0],
    c.firstName,
    c.lastName,
    c.gender || '',
    c.email || '',
    c.mobilePhone || '',
    c.phone || '',
    c.birthDate ? c.birthDate.toISOString().split('T')[0] : '',
    c.streetNumber || '',
    c.streetName || '',
    c.postalCode || '',
    c.city || '',
    c.territorySector || '',
    c.type || '',
    c.source || '',
    c.supportLevel || '',
    c.meetingStep || '',
    c.whatsappStatus || '',
    c.newsletter ? 'Oui' : 'Non',
    c.linkedinUrl || '',
    c.tags?.map((ct: any) => ct.tag.name).join(', ') || '',
    c.notes || '',
  ])

  return { headers: HEADERS, rows }
}

// ──────────────────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.userId) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const allowedRoles = ['ADMINISTRATEUR', 'SUPERVISEUR', 'SUPERADMIN', 'ADMIN']
  const roleToCheck = session.dbRole || session.role
  if (!roleToCheck || !allowedRoles.includes(roleToCheck)) {
    return new NextResponse('Accès refusé. Rôle SUPERVISEUR ou supérieur requis.', { status: 403 })
  }

  try {
    const sp = request.nextUrl.searchParams
    const format = sp.get('format') || 'csv'
    const params = Object.fromEntries(sp.entries())
    let where = buildWhereClause(params)

    const ids = sp.get('ids')
    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      if (idList.length > 0) where = { id: { in: idList }, archivedAt: null }
    }
    const dateStr = new Date().toISOString().split('T')[0]

    const count = await prisma.contact.count({ where })
    await logAudit('EXPORT', 'Contact', null, session.userId, { format, count, filters: params })

    const batchSize = 2000
    const encoder = new TextEncoder()

    if (format === 'xls') {
      const { headers } = formatContacts([])
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Contacts">
    <Table>
      <Row>
        ${headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
      </Row>`))

          let skip = 0
          while (true) {
            const batch = await prisma.contact.findMany({
              where,
              include: { tags: { include: { tag: true } } },
              orderBy: { lastName: 'asc' },
              skip,
              take: batchSize,
            })
            if (batch.length === 0) break

            const { rows } = formatContacts(batch)
            for (const row of rows) {
              const rowXml = `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`
              controller.enqueue(encoder.encode(rowXml))
            }
            skip += batchSize
          }

          controller.enqueue(encoder.encode(`    </Table>
  </Worksheet>
</Workbook>`))
          controller.close()
        }
      })

      const responseHeaders = new Headers()
      responseHeaders.set('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
      responseHeaders.set('Content-Disposition', `attachment; filename="contacts_${dateStr}.xls"`)
      return new NextResponse(stream, { status: 200, headers: responseHeaders })
    }

    // CSV (default) — with UTF-8 BOM for Excel compatibility
    const { headers } = formatContacts([])
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue BOM
        controller.enqueue(encoder.encode('\uFEFF'))
        
        // Enqueue headers
        const headerCsv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';') + '\r\n'
        controller.enqueue(encoder.encode(headerCsv))

        let skip = 0
        while (true) {
          const batch = await prisma.contact.findMany({
            where,
            include: { tags: { include: { tag: true } } },
            orderBy: { lastName: 'asc' },
            skip,
            take: batchSize,
          })
          if (batch.length === 0) break

          const { rows } = formatContacts(batch)
          for (const row of rows) {
            const rowCsv = row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';') + '\r\n'
            controller.enqueue(encoder.encode(rowCsv))
          }
          skip += batchSize
        }
        controller.close()
      }
    })

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8')
    responseHeaders.set('Content-Disposition', `attachment; filename="contacts_${dateStr}.csv"`)
    return new NextResponse(stream, { status: 200, headers: responseHeaders })

  } catch (error) {
    console.error('Export error:', error)
    return new NextResponse('Erreur lors de l\'export', { status: 500 })
  }
}
