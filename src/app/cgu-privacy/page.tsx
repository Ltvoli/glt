import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'CGU & Politique de Confidentialité — BP-Lionel Tivoli',
}

export default function CguPrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem', fontFamily: 'var(--font-source-sans)' }}>
      <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Retour à la connexion
      </Link>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <ShieldCheck size={32} color="#3b82f6" /> CGU & Politique de Confidentialité
      </h1>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          1. Conditions Générales d’Utilisation (CGU)
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Ce service est un outil interne de gestion du bureau parlementaire du Député Lionel Tivoli. Son accès est strictement limité aux collaborateurs autorisés et munis d'un compte utilisateur.
        </p>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          Tout utilisateur s'engage à respecter la confidentialité des dossiers, la sécurité des accès (non-partage de mot de passe) et à n'utiliser les données des citoyens collectées que dans le strict cadre de l'exercice du mandat législatif.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          2. Politique de Confidentialité (Conformité RGPD)
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, les informations recueillies dans cette application (identité, courriels, adresses et numéros de téléphone de citoyens) font l'objet d'un traitement sous la responsabilité de l'équipe parlementaire.
        </p>
        
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '1rem 0 0.5rem 0' }}>Finalités :</h3>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Les données récoltées servent uniquement à :
        </p>
        <ul style={{ color: '#475569', lineHeight: 1.7, paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li>Assurer le suivi des dossiers de sollicitation et d'interventions auprès des ministères et collectivités.</li>
          <li>Gérer l'agenda et la participation des citoyens aux permanences mobiles du Député.</li>
          <li>Notifier les collaborateurs des tâches et des relances de dossiers.</li>
        </ul>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '1rem 0 0.5rem 0' }}>Conservation des données :</h3>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Les données de contacts et les dossiers associés sont archivés et conservés pendant une durée n'excédant pas 5 ans après le terme du mandat législatif du Député. Une purge automatique supprime de façon irréversible les courriers clôturés et dossiers inactifs depuis plus de 3 ans.
        </p>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '1rem 0 0.5rem 0' }}>Vos Droits :</h3>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          Tout citoyen concerné dispose d'un droit d'accès, de rectification, de limitation et d'effacement (droit à l'oubli) de ses données. Pour toute demande d'exercice de droit, vous pouvez contacter l'administrateur système ou l'adresse de contact du bureau parlementaire.
        </p>
      </section>
    </div>
  )
}
