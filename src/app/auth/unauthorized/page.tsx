import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)]">
      <div className="max-w-md w-full bg-[var(--card-bg)] shadow-lg rounded-lg p-8 text-center border border-[var(--border-color)]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-color)] mb-4">Accès Refusé</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          Si vous pensez qu'il s'agit d'une erreur, veuillez contacter un administrateur.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-[var(--primary-color)] text-white rounded-md hover:opacity-90 transition-opacity"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
