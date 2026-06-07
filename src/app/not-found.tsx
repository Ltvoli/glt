import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem' }}>La page que vous recherchez n'existe pas.</p>
      <Link
        href="/"
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
