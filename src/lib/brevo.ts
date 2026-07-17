import prisma from '@/lib/prisma'

export async function getBrevoConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['brevo_api_key', 'brevo_sender_email', 'brevo_sender_name', 'brevo_email_signature']
      }
    }
  })

  const configMap = new Map(settings.map(s => [s.key, s.value]))

  const apiKey = configMap.get('brevo_api_key') || process.env.BREVO_API_KEY || ''
  const senderEmail = configMap.get('brevo_sender_email') || process.env.BREVO_SENDER_EMAIL || 'no-reply@cabinet-parlementaire.fr'
  const senderName = configMap.get('brevo_sender_name') || process.env.BREVO_SENDER_NAME || 'BP-Lionel Tivoli'
  const signature = configMap.get('brevo_email_signature') || ''

  return { apiKey, senderEmail, senderName, signature }
}

export async function sendBrevoEmail(toEmail: string, toName: string, subject: string, htmlContent: string) {
  const { apiKey, senderEmail, senderName } = await getBrevoConfig()
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée (BREVO_API_KEY). Envoi simulé à ${toEmail} (${toName}) : ${subject}`)
    return { simulated: true }
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Erreur Brevo API (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    console.log(`[BREVO] E-mail envoyé avec succès à ${toEmail}. Message ID:`, data.messageId)
    return { success: true, messageId: data.messageId }
  } catch (err) {
    console.error('[BREVO] Échec de l\'envoi de l\'e-mail :', err)
    throw err
  }
}

export async function syncContactToBrevo(contactId: string, listIds: number[] = []) {
  const { apiKey } = await getBrevoConfig()
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée. Synchronisation simulée du contact ${contactId}`)
    return { simulated: true }
  }

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!contact || !contact.email) {
      console.log(`[BREVO] Synchronisation ignorée : contact introuvable ou e-mail manquant pour ID ${contactId}`)
      return { success: false }
    }

    // Formater le numéro de téléphone pour Brevo (format international ex: 33612345678)
    let formattedSms = contact.mobilePhone || contact.phone || ''
    if (formattedSms.startsWith('0')) {
      formattedSms = '33' + formattedSms.substring(1)
    }
    formattedSms = formattedSms.replace(/[^0-9]/g, '')

    const payload: any = {
      email: contact.email,
      attributes: {
        NOM: contact.lastName || '',
        PRENOM: contact.firstName || '',
        VILLE: contact.city || ''
      },
      updateEnabled: true
    }

    if (formattedSms) {
      payload.attributes.SMS = formattedSms
    }

    if (listIds.length > 0) {
      payload.listIds = listIds
    }

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.warn(`[BREVO] Avertissement lors de la synchronisation de ${contact.email} (${res.status}): ${errorText}`)
      return { success: false, error: errorText }
    }

    console.log(`[BREVO] Contact ${contact.email} synchronisé avec succès !`)
    return { success: true }
  } catch (err) {
    console.error('[BREVO] Échec de la synchronisation du contact :', err)
    return { success: false, error: String(err) }
  }
}

export async function syncListToBrevoBatch(contacts: any[], listIds: number[]) {
  const { apiKey } = await getBrevoConfig()
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée. Synchronisation en lot simulée de ${contacts.length} contacts`)
    return { simulated: true, success: true, count: contacts.length }
  }

  // Filtrer les contacts sans email et sans SMS/phone
  const validContacts = contacts.filter(c => c.email || c.mobilePhone || c.phone)
  if (validContacts.length === 0) {
    return { success: false, error: 'Aucun contact valide à synchroniser (tous sans email ni téléphone).' }
  }

  // Construire le CSV
  let csvContent = 'EMAIL;NOM;PRENOM;VILLE;SMS\n'
  for (const contact of validContacts) {
    const email = contact.email || ''
    const nom = contact.lastName || ''
    const prenom = contact.firstName || ''
    const ville = contact.city || ''
    
    let formattedSms = contact.mobilePhone || contact.phone || ''
    if (formattedSms.startsWith('0')) {
      formattedSms = '33' + formattedSms.substring(1)
    }
    formattedSms = formattedSms.replace(/[^0-9]/g, '')

    // Échapper les points-virgules potentiels dans les champs textuels
    const cleanNom = nom.replace(/;/g, ' ')
    const cleanPrenom = prenom.replace(/;/g, ' ')
    const cleanVille = ville.replace(/;/g, ' ')

    csvContent += `${email};${cleanNom};${cleanPrenom};${cleanVille};${formattedSms}\n`
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts/import', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        fileBody: csvContent,
        listIds,
        updateExistingContacts: true,
        emptyContactsAttributes: false
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Erreur Brevo API (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    console.log(`[BREVO] Batch import démarré avec succès ! Process ID:`, data.processId)
    return { success: true, processId: data.processId, count: validContacts.length }
  } catch (err) {
    console.error('[BREVO] Échec de l\'import en lot :', err)
    return { success: false, error: String(err) }
  }
}

export async function sendBrevoSms(toMobile: string, content: string) {
  const { apiKey } = await getBrevoConfig()
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée. Envoi SMS simulé à ${toMobile} : ${content}`)
    return { simulated: true }
  }

  let recipient = toMobile.trim()
  if (recipient.startsWith('0')) {
    recipient = '33' + recipient.substring(1)
  }
  recipient = recipient.replace(/[^0-9]/g, '')

  if (!recipient) {
    throw new Error('Numéro de téléphone invalide')
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: 'BPTivoli',
        recipient,
        content,
        type: 'transactional'
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Erreur Brevo SMS API (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    console.log(`[BREVO] SMS envoyé avec succès à ${recipient}. Message ID:`, data.messageId)
    return { success: true, messageId: data.messageId }
  } catch (err) {
    console.error('[BREVO] Échec de l\'envoi du SMS :', err)
    throw err
  }
}

