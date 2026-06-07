import Link from 'next/link'
import { 
  Settings as SettingsIcon, 
  Layout, 
  Users, 
  Tags, 
  ShieldAlert,
  Mail,
  CheckSquare,
  HelpCircle,
  CalendarDays,
  Send,
  FileText,
  Link2,
  Zap,
  UserCog,
  ShieldCheck,
  Database,
  Wrench
} from 'lucide-react'

const sections = [
  { href: '/settings/general', icon: SettingsIcon, title: 'Général', desc: 'Nom, logo, délais globaux' },
  { href: '/settings/modules', icon: Layout, title: 'Navigation & modules', desc: 'Activer/désactiver les modules' },
  { href: '/settings/contacts', icon: Users, title: 'Contacts & Listes', desc: 'Types, sources, canaux' },
  { href: '/settings/tags', icon: Tags, title: 'Tags', desc: 'Gérer les étiquettes globales' },
  { href: '/settings/support-levels', icon: ShieldAlert, title: 'Niveaux de soutien', desc: 'Qualifications politiques (Sensible)' },
  { href: '/settings/courriers', icon: Mail, title: 'Courriers', desc: 'Catégories, règles' },
  { href: '/settings/tasks', icon: CheckSquare, title: 'Tâches', desc: 'Statuts, priorités' },
  { href: '/settings/qe', icon: HelpCircle, title: 'QE / QAG', desc: 'Thèmes, ministères' },
  { href: '/settings/planning', icon: CalendarDays, title: 'Planning salariés', desc: 'Statuts, quotas' },
  { href: '/settings/sending', icon: Send, title: 'Communication & envois', desc: 'Quotas, expéditeurs' },
  { href: '/settings/templates', icon: FileText, title: 'Modèles de messages', desc: 'Email, SMS, WhatsApp' },
  { href: '/settings/integrations', icon: Link2, title: 'Intégrations / API', desc: 'Brevo, Webhooks, Clés' },
  { href: '/settings/automations', icon: Zap, title: 'Automatisations', desc: 'Règles métiers' },
  { href: '/settings/users-roles', icon: UserCog, title: 'Utilisateurs & rôles', desc: 'Accès et droits' },
  { href: '/settings/security-rgpd', icon: ShieldCheck, title: 'RGPD & sécurité', desc: 'Consentements, conservation' },
  { href: '/settings/exports-backups', icon: Database, title: 'Exports & sauvegardes', desc: 'Données brutes, backups' },
  { href: '/settings/maintenance', icon: Wrench, title: 'Maintenance', desc: 'Logs système, cache' },
]

export default function SettingsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {sections.map((sec) => (
        <Link key={sec.href} href={sec.href} className="card" style={{ display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}>
              <sec.icon size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{sec.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{sec.desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
