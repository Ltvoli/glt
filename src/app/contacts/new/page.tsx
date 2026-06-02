import ContactForm from './contact-form'
import Link from 'next/link'

export default function NewContactPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/contacts" className="button outline">Retour</Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouveau Contact</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <ContactForm />
      </div>
    </div>
  )
}
