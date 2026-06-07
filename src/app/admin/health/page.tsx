import { requireWriteAccess } from '@/lib/session'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Activity, Database, HardDrive, Clock, AlertTriangle } from 'lucide-react'

export default async function AdminHealthPage() {
  const session = await requireWriteAccess().catch(() => null)
  
  // Restriction d'accès
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
    redirect('/')
  }

  // Mesure latence DB
  const dbStart = Date.now()
  let dbStatus = 'down'
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'up'
  } catch(e) {}
  const dbLatency = Date.now() - dbStart

  // Vérification de la version de l'application via les variables d'environnement Vercel
  const appVersion = process.env.npm_package_version || '0.1.0'
  const vercelEnv = process.env.VERCEL_ENV || 'VPS (Local)'

  // Erreurs récentes (AuditLog peut servir si on logue les erreurs métier)
  // Pour l'exemple, on récupère les 5 derniers audits "ERROR" s'ils existent, 
  // ou on affiche qu'il n'y a pas d'erreur critique loguée en BDD.
  const recentErrors = await prisma.auditLog.findMany({
    where: { action: 'ERROR' },
    orderBy: { createdAt: 'desc' },
    take: 5
  }).catch(() => [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1e293b' }}>
        Supervision & Santé du Système
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Statut Global */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Activity color="#2563eb" size={24} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Application</h3>
          </div>
          <p style={{ margin: 0, color: '#475569' }}>Version: <strong>v{appVersion}</strong></p>
          <p style={{ margin: 0, color: '#475569' }}>Environnement: <strong>{vercelEnv}</strong></p>
        </div>

        {/* Base de données */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Database color={dbStatus === 'up' ? '#16a34a' : '#dc2626'} size={24} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Base de Données</h3>
          </div>
          <p style={{ margin: 0, color: '#475569' }}>Statut: <strong style={{ color: dbStatus === 'up' ? '#16a34a' : '#dc2626' }}>{dbStatus === 'up' ? 'En ligne' : 'Hors ligne'}</strong></p>
          <p style={{ margin: 0, color: '#475569' }}>Latence: <strong>{dbLatency} ms</strong></p>
        </div>

        {/* Stockage / Disque */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <HardDrive color="#ca8a04" size={24} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Espace Disque (VPS)</h3>
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem' }}>
            Pour une lecture en temps réel de l'espace disque, consultez l'API <a href="/api/health" target="_blank" style={{ color: '#2563eb' }}>/api/health</a>.
          </p>
        </div>

      </div>

      {/* Erreurs Récentes */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <AlertTriangle color="#dc2626" size={24} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Erreurs Critiques Récentes</h3>
        </div>
        
        {recentErrors.length === 0 ? (
          <p style={{ color: '#16a34a', margin: 0 }}>Aucune erreur critique enregistrée récemment.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Entité</th>
                <th style={{ padding: '0.5rem' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {recentErrors.map(err => (
                <tr key={err.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem' }}>{new Date(err.createdAt).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '0.5rem' }}>{err.entity}</td>
                  <td style={{ padding: '0.5rem', color: '#dc2626' }}>{err.newValues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
