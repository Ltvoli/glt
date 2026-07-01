export async function sendBrevoEmail(toEmail: string, toName: string, subject: string, htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.log(`[BREVO SIMULATION] API Key non configurée (BREVO_API_KEY). Envoi simulé à ${toEmail} (${toName}) : ${subject}`)
    return { simulated: true }
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@cabinet-parlementaire.fr'
  const senderName = process.env.BREVO_SENDER_NAME || 'Bureau Parlementaire'

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
