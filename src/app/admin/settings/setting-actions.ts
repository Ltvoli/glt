'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { SettingType } from '@prisma/client'

async function getSuperAdminSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non autorisé')
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || user.role !== 'SUPERADMIN') throw new Error('Accès réservé au SuperAdmin')
  return user
}

export async function createSetting(prevState: any, formData: FormData) {
  try {
    const admin = await getSuperAdminSession()
    
    const key = formData.get('key') as string
    const value = formData.get('value') as string
    let type = formData.get('type') as SettingType
    const label = formData.get('label') as string
    const category = formData.get('category') as string
    const isSecret = formData.get('isSecret') === 'true'

    if (!key || !value) return { success: false, error: 'La clé et la valeur sont requises.' }

    if (isSecret) {
      type = SettingType.SECRET
    }

    // Validation basique
    if (type === 'BOOLEAN' && value !== 'true' && value !== 'false') {
      return { success: false, error: 'Valeur booléenne invalide (true/false attendu).' }
    }
    if (type === 'NUMBER' && isNaN(Number(value))) {
      return { success: false, error: 'Valeur numérique invalide.' }
    }
    if (type === 'JSON') {
      try { JSON.parse(value) } catch { return { success: false, error: 'JSON invalide.' } }
    }

    const existing = await prisma.setting.findUnique({ where: { key } })
    if (existing) return { success: false, error: 'Cette clé existe déjà.' }

    await prisma.setting.create({
      data: {
        key,
        value,
        type,
        label: label || key,
        category: category || 'general'
      }
    })

    await logAudit('CREATE', 'Setting', key, admin.id, { key, type, category })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}

export async function updateSetting(key: string, newValue: string) {
  try {
    const admin = await getSuperAdminSession()
    
    const setting = await prisma.setting.findUnique({ where: { key } })
    if (!setting) return { success: false, error: 'Paramètre introuvable.' }

    // Validation
    if (setting.type === 'BOOLEAN' && newValue !== 'true' && newValue !== 'false') {
      return { success: false, error: 'Valeur booléenne invalide (true/false attendu).' }
    }
    if (setting.type === 'NUMBER' && isNaN(Number(newValue))) {
      return { success: false, error: 'Valeur numérique invalide.' }
    }
    if (setting.type === 'JSON') {
      try { JSON.parse(newValue) } catch { return { success: false, error: 'JSON invalide.' } }
    }

    await prisma.setting.update({
      where: { key },
      data: { value: newValue }
    })

    await logAudit('UPDATE', 'Setting', key, admin.id, { 
      oldValue: setting.type === 'SECRET' ? '***' : setting.value, 
      newValue: setting.type === 'SECRET' ? '***' : newValue 
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}
