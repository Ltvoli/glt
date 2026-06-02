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
            createdById: session.userId
          }

          if (potentialDuplicates.length > 0) {
            const newContact = await prisma.contact.create({ data: dataToInsert })

            await prisma.duplicateCandidate.create({
              data: {
                contact1Id: potentialDuplicates[0].id,
                contact2Id: newContact.id,
                reason: potentialDuplicates[0].email === email ? 'NOM_EMAIL' : 'NOM_PHONE'
              }
            })
            
            duplicates++
          } else {
            await prisma.contact.create({ data: dataToInsert })
            created++
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
