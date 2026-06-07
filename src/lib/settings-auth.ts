import { getSession } from './session'
import { redirect } from 'next/navigation'
import { requirePermission } from './permissions'

/**
 * Valide que l'utilisateur courant a les droits pour accéder aux paramètres.
 */
export async function requireSettingsAccess() {
  const session = await getSession()
  
  if (!session?.userId) {
    redirect('/login')
  }

  // Vérifier la permission globale
  requirePermission(session.role, 'MANAGE_SETTINGS')

  return session
}
