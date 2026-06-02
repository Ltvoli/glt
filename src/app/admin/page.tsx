import prisma from '@/lib/prisma'

export default async function AdminDashboardPage() {
  const usersCount = await prisma.user.count()
  const activeCount = await prisma.user.count({ where: { NOT: { email: { contains: 'archive' } } } })
  const auditLogsCount = await prisma.auditLog.count()
  const qeCount = await prisma.writtenQuestion.count()
  const mailsCount = await prisma.mailCase.count()
  const tasksCount = await prisma.task.count()

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Vue d'ensemble du Système</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Indicateurs techniques et santé de la base de données.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Utilisateurs Inscrits</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--primary)' }}>{usersCount}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Logs d'Audit</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{auditLogsCount}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Mails Entrants/Sortants</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{mailsCount}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Questions (QE)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{qeCount}</p>
        </div>
      </div>
      
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Informations de l'environnement</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-muted)' }}>
          <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}><strong>Base de données :</strong> SQLite / Prisma</li>
          <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}><strong>Environnement :</strong> Production (Next.js App Router)</li>
          <li style={{ padding: '0.5rem 0' }}><strong>Version Node :</strong> v18+</li>
        </ul>
      </div>
    </div>
  )
}
