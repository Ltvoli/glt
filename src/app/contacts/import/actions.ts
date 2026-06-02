'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Papa from 'papaparse'

export async function processImport(formData: FormData) {
  const session = await getSession()
  if (!session?.userId) return { error: 'Non autorisé' }

  const file = formData.get('file') as File
  if (!file) return { error: 'Aucun fichier fourni' }

  const text = await file.text()
  
  return new Promise<any>((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let created = 0
        let duplicates = 0
        let errorsCount = 0

        for (const row of results.data as any[]) {
          // Mapping très basique - À adapter selon le vrai CSV Qomon
          const firstName = row['Prénom'] || row['prenom'] || row['first_name']
          const lastName = row['Nom'] || row['nom'] || row['last_name']
          const email = row['Email'] || row['email']
          const phone = row['Téléphone'] || row['Téléphone fixe'] || row['telephone'] || row['phone']
          const mobilePhone = row['Portable'] || row['portable'] || row['mobile']
          const streetNumber = row['Numéro'] || row['numero'] || row['street_number']
          const streetName = row['Rue/voie'] || row['rue'] || row['voie'] || row['street_name']
          const postalCode = row['Code postal'] || row['code_postal'] || row['cp'] || row['zip']
          const city = row['Ville'] || row['Commune'] || row['commune'] || row['city']
          const gender = row['Genre'] || row['genre'] || row['sexe']
          const supportLevel = row['Niveau de Soutien'] || row['niveau_soutien'] || row['support_level']
          const birthDateStr = row['Date de naissance'] || row['date_naissance'] || row['birthdate']
          
          const tagsStr = row['Tags'] || row['tags'] || row['mots_cles'] || ''
          const linkedinUrl = row['LinkedIn'] || row['linkedin'] || null
          const territorySector = row['Secteur'] || row['secteur'] || row['canton'] || null
          const notes = row['Notes'] || row['notes'] || null
          const newsletterStr = row['Newsletter'] || row['newsletter']
          const newsletter = newsletterStr ? (newsletterStr.toLowerCase() === 'oui' || newsletterStr.toLowerCase() === 'true' || newsletterStr === '1') : false

          let birthDate = null
          if (birthDateStr) {
            const parsed = new Date(birthDateStr)
            if (!isNaN(parsed.getTime())) birthDate = parsed
          }
          
          if (!firstName || !lastName) {
            errorsCount++
            continue
          }

          // Détection doublons
          const potentialDuplicates = await prisma.contact.findMany({
            where: {
              OR: [
                { email: email || 'FAKE_EMAIL_NIL' },
                { phone: phone || 'FAKE_PHONE_NIL' },
                { mobilePhone: mobilePhone || 'FAKE_MOBILE_NIL' }
              ],
              AND: {
                lastName: { equals: lastName }
              }
            }
          })

          const dataToInsert = {
            firstName,
            lastName,
            email: email || null,
            phone: phone || null,
            mobilePhone: mobilePhone || null,
            streetNumber: streetNumber || null,
            streetName: streetName || null,
            postalCode: postalCode || null,
            city: city || null,
            gender: gender || null,
            supportLevel: supportLevel || null,
            birthDate,
            type: 'ELECTEUR',
            source: 'QOMON',
            territorySector,
            linkedinUrl,
            notes,
            newsletter,
            createdById: session.userId
          }

          let insertedContact = null

          if (potentialDuplicates.length > 0) {
            insertedContact = await prisma.contact.create({ data: dataToInsert })

            for (const dup of potentialDuplicates) {
              await prisma.duplicateCandidate.create({
                data: {
                  contact1Id: dup.id,
                  contact2Id: insertedContact.id,
                  reason: dup.email === email ? 'NOM_EMAIL' : 'NOM_PHONE'
                }
              })
            }
            duplicates++
          } else {
            insertedContact = await prisma.contact.create({ data: dataToInsert })
            created++
          }

          // Traitement des tags pour ce contact importé
          if (insertedContact && tagsStr) {
            const tagNames = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t)
            for (const tagName of tagNames) {
              const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName, color: '#e2e8f0' }
              })
              await prisma.contactTag.create({
                data: { contactId: insertedContact.id, tagId: tag.id }
              })
            }
          }
        }

        // Log the import
        await prisma.importLog.create({
          data: {
            filename: file.name,
            status: 'SUCCESS',
            rowsImported: created + duplicates,
            userId: session.userId
          }
        })

        resolve({ created, duplicates, errors: errorsCount })
      },
      error: () => {
        resolve({ error: 'Erreur lors du parsing du fichier CSV' })
      }
    })
  })
}
