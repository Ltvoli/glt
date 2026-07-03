import prisma from '@/lib/prisma'

export async function sendBrevoEmail(toEmail: string, toName: string, subject: string, htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée (BREVO_API_KEY). Envoi simulé à ${toEmail} (${toName}) : ${subject}`)
    return { simulated: true }
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@cabinet-parlementaire.fr'
  const senderName = process.env.BREVO_SENDER_NAME || 'BP-Lionel Tivoli'

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
  const apiKey = process.env.BREVO_API_KEY
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
