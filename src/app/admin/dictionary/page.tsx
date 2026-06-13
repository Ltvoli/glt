import { getDictionary } from './actions'
import DictionaryManager from './dictionary-manager'

export const metadata = {
  title: 'Dictionnaire de données | Admin',
}

export default async function DictionaryAdminPage() {
  const dictionary = await getDictionary()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dictionnaire de Données</h1>
        <p className="text-slate-500 mt-1">Gérez les listes déroulantes de l'application (Statuts, Catégories, etc.).</p>
      </div>

      <DictionaryManager initialData={dictionary} />
    </div>
  )
}
