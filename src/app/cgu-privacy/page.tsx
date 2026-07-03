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

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          3. Registre Simplifié des Traitements
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Conformément aux principes de transparence du RGPD, voici le registre des données traitées au sein de l'application :
        </p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#475569', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.5rem' }}>Catégorie de données</th>
                <th style={{ padding: '0.5rem' }}>Finalité</th>
                <th style={{ padding: '0.5rem' }}>Accès</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>Contacts (Noms, Emails, Téléphones, Adresses)</td>
                <td style={{ padding: '0.5rem' }}>Gestion des relations publiques, suivi des dossiers et permanences</td>
                <td style={{ padding: '0.5rem' }}>Collaborateurs autorisés</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>Salariés / Utilisateurs</td>
                <td style={{ padding: '0.5rem' }}>Gestion du planning, assignation de tâches et validation</td>
                <td style={{ padding: '0.5rem' }}>Administrateurs et équipe interne</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>Fichiers Joints</td>
                <td style={{ padding: '0.5rem' }}>Pièces justificatives des sollicitations citoyennes</td>
                <td style={{ padding: '0.5rem' }}>Collaborateurs autorisés</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}>Logs d'audit</td>
                <td style={{ padding: '0.5rem' }}>Traçabilité des accès et sécurité (qui a fait quoi)</td>
                <td style={{ padding: '0.5rem' }}>Administrateurs système</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          4. Droit à l'Oubli et Pseudonymisation des Comptes
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          Lorsqu'un compte utilisateur (collaborateur) est supprimé ou révoqué, l'application applique un principe strict de <strong>pseudonymisation</strong>. Les informations identifiantes (email) sont altérées et les droits d'accès sont révoqués de façon définitive afin de préserver l'historique et la traçabilité des dossiers traités sans conserver de données nominatives inutiles.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          5. Sécurité Applicative et Technique
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '1rem' }}>
          Le cabinet s'engage à assurer la sécurité technique de vos données personnelles via les mesures suivantes :
        </p>
        <ul style={{ color: '#475569', lineHeight: 1.7, paddingLeft: '1.5rem', margin: 0 }}>
          <li>Mots de passe hashés de manière sécurisée (algorithme <strong>bcrypt avec un coût de 12</strong>).</li>
          <li>Sessions authentifiées par cookies sécurisés avec attributs `HttpOnly` et `SameSite=Strict`.</li>
          <li>Filtres anti Path-Traversal lors des chargements de documents.</li>
          <li>Blocage systématique et automatique de tout fichier exécutable (.exe, .sh, .bat).</li>
          <li>Principe du moindre privilège appliqué par rôle de sécurité (Administrateur, Superviseur, Coordinateur, Lecteur).</li>
        </ul>
      </section>

      <footer style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
        Réalisation : DigitaleInfluence By Franck Galbert
      </footer>
    </div>
  )
}
