'use server'

import { login } from '@/lib/session'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function authenticate(prevState: any, formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return { error: 'Identifiants incorrects.' }
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    return { error: 'Identifiants incorrects.' }
  }

  await login(user.id, user.role)
  
  return { success: true }
}
