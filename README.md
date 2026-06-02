# Système de gestion du bureau parlementaire

Logiciel interne de gestion pour le bureau parlementaire du député Lionel Tivoli, permettant à l'équipe de centraliser les contacts, tâches, courriers, questions écrites et plannings.

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
