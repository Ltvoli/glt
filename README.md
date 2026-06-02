# Système de gestion du bureau parlementaire

Logiciel interne de gestion pour le bureau parlementaire du député Lionel Tivoli, permettant à l'équipe de centraliser les contacts, tâches, courriers, questions écrites et plannings.

## Modules
- [x] **Phase 1** : Base de données, Auth, Contacts (Qomon import)
- [x] **Phase 2** : Tâches, Dashboard 7 jours, Notifications
- [x] **Phase 3** : Courriers entrants/sortants
- [x] **Phase 4** : Questions Écrites (QE, QAG, Amendements)
- [x] **Phase 5** : Agenda, Planning mensuel, Compteurs de jours travaillés et Rapports

### Phase 5 — Agenda, planning salariés et rapports
- **Calendrier Mensuel** : Affichage interactif avec pré-remplissage automatique des week-ends et des jours fériés français.
- **Statuts Couleurs** : Vert (Travaillé), Blanc (Non travaillé), Rouge (Congé Payé), Jaune (Jour Férié), Gris (Week-end).
- **Période Annuelle** : La période de référence pour les quotas court par défaut du **1er Juin au 31 Mai**.
- **Paramétrage Quotas** : Vue dédiée permettant à un administrateur (Magali / Lionel) de définir le nombre de jours annuels de chaque salarié (ex: 218 jours).
- **Exports & Rapports** : Une page de "Rapports Hebdomadaires Globaux" agrégeant les KPIs des tâches, courriers, questions écrites et les compteurs du planning (avec support de l'impression PDF/papier).
- **Permissions** : La saisie et le paramétrage sont restreints à l'administrateur (Magali/Lionel). Les modifications déclenchent une journalisation dans l'AuditLog.


## Architecture Cible & Phase 0
Ce projet est développé selon une méthode stricte détaillée dans le fichier `.antigravity-rules.md`. 
Le backend repose sur les Server Actions de Next.js, tandis que la base de données actuelle (SQLite + Prisma) a vocation à basculer vers PostgreSQL pour garantir la scalabilité et les sauvegardes automatiques en production. L'authentification est internalisée via JWT (`jose`) et le hashage `bcryptjs`.
Le projet est protégé par le RGPD via l'utilisation de suppressions logiques (`archivedAt`), de journaux d'audit et d'une validation centralisée.

## Modules Fonctionnels
- [x] **Phase 1** : Base de données, Auth, Contacts (Qomon import)
- [x] **Phase 2** : Tâches, Dashboard 7 jours, Notifications
- [x] **Phase 3** : Courriers entrants/sortants
- [x] **Phase 4** : Questions Écrites (QE, QAG, Amendements)
- [x] **Phase 5** : Agenda, Planning mensuel, Compteurs de jours travaillés et Rapports (Vanilla CSS) avec variables CSS


## Stack Technique (Phase 1)
- **Framework :** Next.js (App Router)
- **Base de données :** SQLite (via Prisma ORM)
- **Authentification :** Sessions JWT chiffrées personnalisées
- **Style :** CSS Modules (Vanilla CSS) avec variables CSS

## Installation locale

1. **Prérequis :** Node.js 18+ installé sur la machine.
2. **Cloner / Télécharger** le répertoire.
3. **Installer les dépendances :**
   ```bash
   npm install
   ```
4. **Configurer l'environnement :**
   Copiez ou créez un fichier `.env` à la racine (généré automatiquement par Prisma normalement) :
   ```env
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="remplacez_ceci_par_une_cle_secrete_très_longue_en_production"
   ```
5. **Initialiser la base de données :**
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
   *Note: Le script de seed crée les 5 utilisateurs prévus (Lionel, Magali, Andréa, Franck, Pierre) avec le mot de passe temporaire `password123`.*

6. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   Rendez-vous sur `http://localhost:3000`.

## Fonctionnalités de la Phase 1 (Actuelles)
- Authentification sécurisée (login/logout).
- Tableau de bord avec compteurs.
- Gestion des contacts (Création, Édition, Archivage soft-delete).
- Recherche multicritères sur les contacts.
- Importation CSV Qomon avec détection de doublons basique (nom+tél, nom+email) et mise en attente.
- Journalisation (Audit Log) de toutes les actions sur les contacts.

## Déploiement en Production
Pour un hébergement sur un serveur existant (Linux/Windows) :
1. Construisez l'application : `npm run build`
2. Lancez le serveur de production : `npm start`
*Note : Il est fortement recommandé d'utiliser un gestionnaire de processus comme PM2 (`pm2 start npm --name "tivoli-crm" -- start`) et de configurer un reverse proxy Nginx avec un certificat HTTPS (Let's Encrypt) pour respecter le RGPD.*
