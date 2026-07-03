import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendBrevoEmail } from '@/lib/brevo'

export async function GET(request: Request) {
  // Optionnel : vérifier un token secret (ex: cron-secret) pour sécuriser la route
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret'}` && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const users = await prisma.user.findMany()

    const d = new Date()
    const todayStart = new Date(d)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(d)
    todayEnd.setHours(23, 59, 59, 999)

    let emailsSimulated = 0

    for (const user of users) {
      // Tâches en retard
      const overdueTasks = await prisma.task.findMany({
        where: { assigneeId: user.id, status: { notIn: ['TERMINEE', 'ANNULEE'] }, dueDate: { lt: todayStart } }
      })

      // Tâches du jour
      const todayTasks = await prisma.task.findMany({
        where: { assigneeId: user.id, status: { notIn: ['TERMINEE', 'ANNULEE'] }, dueDate: { gte: todayStart, lte: todayEnd } }
      })

      // Courriers urgents ou en retard
      const actionMails = await prisma.mailCase.findMany({
        where: { 
          assigneeId: user.id, 
          status: { notIn: ['REPONDU', 'CLASSE'] }, 
          OR: [
            { responseDueDate: { lt: todayEnd } },
            { urgency: 'HAUTE' }
          ]
        }
      })

      if (overdueTasks.length > 0 || todayTasks.length > 0 || actionMails.length > 0) {
        // Construction du HTML de l'email
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bonjour ${user.firstName}, voici votre résumé d'activité quotidien</h2>
            
            ${overdueTasks.length > 0 ? `
              <h3 style="color: #ef4444;">⚠️ Tâches en retard (${overdueTasks.length})</h3>
              <ul>
                ${overdueTasks.map(t => `<li>${t.title}</li>`).join('')}
              </ul>
            ` : ''}

            ${todayTasks.length > 0 ? `
              <h3 style="color: #3b82f6;">📅 Tâches du jour (${todayTasks.length})</h3>
              <ul>
                ${todayTasks.map(t => `<li>${t.title}</li>`).join('')}
              </ul>
            ` : ''}

            ${actionMails.length > 0 ? `
              <h3 style="color: #eab308;">✉️ Courriers requérant votre attention (${actionMails.length})</h3>
              <ul>
                ${actionMails.map(m => `<li>[${m.reference}] ${m.subject}</li>`).join('')}
              </ul>
            ` : ''}

            <p>Bonne journée,<br/>Votre CRM Parlementaire</p>
          </div>
        `

        // === ENVOI BREVO ===
        try {
          await sendBrevoEmail(
            user.email,
            `${user.firstName} ${user.lastName}`,
            "Résumé d'activité quotidien — BP-Lionel Tivoli",
            emailHtml
          )
        } catch (e) {
          console.error(`[CRON DIGEST] Erreur lors de l'envoi à ${user.email}:`, e)
        }
        emailsSimulated++
      }
    }

    return NextResponse.json({ success: true, emailsSimulated })
  } catch (error) {
    console.error('[CRON DIGEST] Erreur', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
