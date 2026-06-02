'use server'

import { logout as sessionLogout } from '@/lib/session'
import { redirect } from 'next/navigation'

export async function logout() {
  await sessionLogout()
  redirect('/login')
}
