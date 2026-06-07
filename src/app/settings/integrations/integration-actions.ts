'use server'

import prisma from '@/lib/prisma'
import { requireSettingsAccess } from '@/lib/settings-auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getIntegrations() {
  await requireSettingsAccess()
  // On initialise les fournisseurs par défaut s'ils n'existent pas
  const providers = ['BREVO', 'WHATSAPP', 'QOMON']
  
  for (const provider of providers) {
    await prisma.integration.upsert({
      where: { provider },
      update: {},
      create: { provider, isActive: false }
    })
  }

  return await prisma.integration.findMany({
    orderBy: { provider: 'asc' }
  })
}

export async function updateIntegration(prevState: any, formData: FormData) {
  const session = await requireSettingsAccess()

  const id = formData.get('id') as string
  const apiKey = formData.get('apiKey') as string
  const isActive = formData.get('isActive') === 'true'
  
  if (!id) return { error: 'ID requis.' }

  try {
    const updated = await prisma.integration.update({
      where: { id },
      data: {
        secrets: apiKey ? JSON.stringify({ apiKey }) : null,
        isActive
      }
    })

    await logAudit('UPDATE', 'Integration', updated.provider, session.userId, { isActive, hasApiKey: !!apiKey })

    revalidatePath('/settings/integrations')
    return { success: true }
  } catch (error) {
    return { error: 'Erreur lors de la mise à jour de l\'intégration.' }
  }
}
