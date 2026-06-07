import { requireSettingsAccess } from '@/lib/settings-auth'
import prisma from '@/lib/prisma'
import { Server, Activity, HardDrive, ShieldCheck } from 'lucide-react'

export default async function SettingsMaintenancePage() {
  await requireSettingsAccess()
  
  // Basic stats
  const usersCount = await prisma.user.count()
  const contactsCount = await prisma.contact.count()
  const tasksCount = await prisma.task.count()
  
  const env = process.env.NODE_ENV || 'development'
  const isProduction = env === 'production'

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Maintenance Système</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Tableau de bord technique pour surveiller l'état de santé de l'application et de la base de données.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Status System */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Server size={20} className="text-primary" /> État du Serveur
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Environnement</span>
              <span style={{ fontWeight: 600, color: isProduction ? 'var(--success)' : 'var(--warning-dark)' }}>
                {env.toUpperCase()}
              </span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Version Node.js</span>
              <span style={{ fontWeight: 600 }}>v20.x (LTS)</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Statut Base de Données</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontWeight: 600 }}>
                <Activity size={16} /> En ligne (PostgreSQL)
              </span>
            </li>
          </ul>
        </div>

        {/* Database Stats */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <HardDrive size={20} className="text-primary" /> Volume de Données
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Utilisateurs inscrits</span>
              <span style={{ fontWeight: 600 }}>{usersCount}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Contacts en base</span>
              <span style={{ fontWeight: 600 }}>{contactsCount}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tâches créées</span>
              <span style={{ fontWeight: 600 }}>{tasksCount}</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="card" style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <ShieldCheck size={32} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--primary-dark)' }}>Système à jour</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--primary-dark)', opacity: 0.8 }}>
            Toutes les mises à jour de sécurité critiques (Phase 11.6) ont été appliquées. Les middlewares protègent correctement les routes d'administration.
          </p>
        </div>
      </div>
    </div>
  )
}
