import Link from 'next/link'
import ImportForm from './import-form'

export default function ImportPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/contacts" className="button outline">Retour</Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Importer des contacts</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Sélectionnez le fichier Excel (.xlsx, .xls) ou CSV contenant vos contacts. Le système détectera automatiquement les colonnes et importera les contacts.
          Les doublons (nom + email ou nom + téléphone) seront mis en attente pour vérification manuelle.
        </p>

        <ImportForm />
      </div>
    </div>
  )
}
